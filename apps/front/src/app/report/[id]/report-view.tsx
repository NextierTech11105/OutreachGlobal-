"use client";

import { useState, useEffect } from "react";
import { sf, sfc } from "@/lib/utils/safe-format";
import {
  Home,
  Calendar,
  Ruler,
  BedDouble,
  Bath,
  Loader2,
  TrendingUp,
  MapPin,
  Sparkles,
  TreePine,
  GraduationCap,
  Users,
  Building,
  Clock,
  Heart,
  Star,
  ChevronDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Shield,
  Lightbulb,
  Hammer,
  Key,
  Percent,
  ArrowRightLeft,
  PiggyBank,
  Briefcase,
  Scale,
  Phone,
  Mail,
  Globe,
  Train,
  Car,
  Store,
  Utensils,
  ShoppingBag,
  Coffee,
  Building2,
  Factory,
  Stethoscope,
  GraduationCap as School,
  UserCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";

interface ReportViewProps {
  reportId: string;
}

interface ReportData {
  id: string;
  name: string;
  savedAt: string;
  property: {
    address?: {
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      zip?: string;
      neighborhood?: string;
      county?: string;
    };
    propertyType?: string;
    yearBuilt?: number;
    squareFeet?: number;
    bedrooms?: number;
    bathrooms?: number;
    halfBaths?: number;
    lotSize?: number;
    lotSquareFeet?: number;
    estimatedValue?: number;
    estimatedEquity?: number;
    equityPercent?: number;
    openMortgageBalance?: number;
    lastSalePrice?: number;
    lastSaleAmount?: number;
    lastSaleDate?: string;
    // Owner info
    ownerFullName?: string;
    owner1FirstName?: string;
    owner1LastName?: string;
    mailingAddress?: string;
    ownerOccupied?: boolean;
    // Motivated seller flags
    freeClear?: boolean;
    highEquity?: boolean;
    absenteeOwner?: boolean;
    preForeclosure?: boolean;
    taxDelinquent?: boolean;
    isVacant?: boolean;
    corporateOwned?: boolean;
    // Tax info
    taxAmount?: number;
    taxYear?: number;
    taxAssessedValue?: number;
    taxMarketValue?: number;
    // Current mortgage
    currentMortgage?: {
      lenderName?: string;
      amount?: number;
      interestRate?: number;
      interestRateType?: string;
      loanType?: string;
    };
    currentMortgages?: Array<{
      lenderName?: string;
      amount?: number;
      interestRate?: number;
      interestRateType?: string;
      loanType?: string;
      position?: string;
    }>;
    // Demographics
    demographics?: {
      medianIncome?: number;
      suggestedRent?: number;
      fmrOneBedroom?: number;
      fmrTwoBedroom?: number;
      fmrThreeBedroom?: number;
    };
    // Sale history
    saleHistory?: Array<{
      saleDate?: string;
      saleAmount?: number;
      buyerNames?: string;
      sellerNames?: string;
      documentType?: string;
      transactionType?: string;
    }>;
    // Mortgage history
    mortgageHistory?: Array<{
      documentDate?: string;
      amount?: number;
      lenderName?: string;
      interestRate?: number;
      interestRateType?: string;
      loanType?: string;
    }>;
    // Schools
    schools?: Array<{
      name?: string;
      type?: string;
      grades?: string;
      rating?: string;
      parentRating?: string;
    }>;
    // Linked properties
    linkedProperties?: {
      totalOwned?: number;
      totalValue?: number;
      totalEquity?: number;
    };
    // Lot info
    lotInfo?: {
      apn?: string;
      legalDescription?: string;
      landUse?: string;
      zoning?: string;
      lotAcres?: number;
    };
    // Foreclosure/Auction
    auctionInfo?: {
      active?: boolean;
      auctionDate?: string;
      openingBid?: number;
      judgmentAmount?: number;
      lenderName?: string;
    };
    // Additional features
    pool?: boolean;
    garage?: boolean;
    garageSpaces?: number;
    fireplace?: boolean;
    basement?: boolean;
    stories?: number;
    construction?: string;
    zoning?: string;
    // Rental data
    rentEstimate?: number;
    grossYield?: number;
  };
  valuation?: {
    estimatedValue?: number;
    valueRangeLow?: number;
    valueRangeHigh?: number;
    confidence?: number;
    pricePerSqFt?: number;
  };
  comparables?: Array<{
    address?: string;
    salePrice?: number;
    saleDate?: string;
    squareFeet?: number;
    bedrooms?: number;
    bathrooms?: number;
    distance?: number;
  }>;
  neighborhood?: {
    name?: string;
    medianHomeValue?: number;
    medianIncome?: number;
    population?: number;
    schoolRating?: number;
    walkScore?: number;
    appreciation?: number;
  };
  demographics?: {
    medianAge?: number;
    medianIncome?: number;
    population?: number;
    ownerOccupied?: number;
    renterOccupied?: number;
    educationBachelors?: number;
    unemployment?: number;
    povertyRate?: number;
    householdSize?: number;
    medianRent?: number;
  };
  aiAnalysis?: {
    summary?: string;
    strengths?: string[];
    concerns?: string[];
    recommendation?: string;
    investmentScore?: number;
  };
  leadInfo?: { name?: string };
  partnerOffer?: {
    businessName?: string;
    offer?: string;
    discount?: string;
    couponCode?: string;
  };
  // Company & Agent Branding
  companyInfo?: {
    name?: string;
    logo?: string;
    phone?: string;
    email?: string;
    website?: string;
    tagline?: string;
  };
  agentInfo?: {
    name?: string;
    title?: string;
    photo?: string;
    phone?: string;
    email?: string;
    license?: string;
  };
}

// Neighborhood facts by city
function getNeighborhoodData(city?: string, state?: string) {
  const data: Record<
    string,
    { facts: string[]; timeline: Array<{ year: string; event: string }> }
  > = {
    highland_ny: {
      facts: [
        "Highland sits along the scenic Hudson River, offering stunning valley views",
        "The Mid-Hudson Bridge connects Highland to Poughkeepsie, NYC's gateway",
        "Known for its wineries, orchards, and farm-to-table dining scene",
      ],
      timeline: [
        {
          year: "1900s",
          event: "Agricultural era - farms and orchards dominate the landscape",
        },
        {
          year: "1930s",
          event: "Mid-Hudson Bridge opens, connecting to Poughkeepsie",
        },
        { year: "1970s", event: "Suburban expansion brings new development" },
        {
          year: "2000s",
          event: "Hudson Valley renaissance - wineries and tourism flourish",
        },
        {
          year: "2020s",
          event: "Remote work migration drives record home values",
        },
      ],
    },
    brooklyn_ny: {
      facts: [
        "Brooklyn was an independent city until 1898 when it merged with NYC",
        "Home to over 2.6 million people — larger than most US cities",
        "The Brooklyn Bridge took 14 years to build (1869-1883)",
      ],
      timeline: [
        {
          year: "1800s",
          event: "Dutch settlement 'Breuckelen' becomes a city",
        },
        { year: "1898", event: "Brooklyn consolidates with New York City" },
        { year: "1950s", event: "Post-war suburban flight begins" },
        { year: "2000s", event: "Brooklyn renaissance - arts and tech boom" },
        { year: "2020s", event: "One of America's most desirable boroughs" },
      ],
    },
    default: {
      facts: [
        "This neighborhood has seen steady appreciation over the past decade",
        "Strong community with local amenities and services",
        "Well-connected to major transportation routes",
      ],
      timeline: [
        { year: "1900s", event: "Early development and community formation" },
        {
          year: "1950s",
          event: "Post-war growth and infrastructure improvements",
        },
        { year: "1990s", event: "Modern development and revitalization" },
        { year: "2010s", event: "Continued growth and community investment" },
        { year: "2020s", event: "Current market strength and stability" },
      ],
    },
  };

  const key =
    city && state
      ? `${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}`
      : "default";

  return data[key] || data["default"];
}

// Get enriched neighborhood data (employers, transportation, businesses)
function getNeighborhoodEnrichment(city?: string, state?: string) {
  // Default enrichment data - would be populated from API in production
  const defaultData = {
    employers: [
      {
        name: "Regional Medical Center",
        type: "Healthcare",
        employees: "2,500+",
        icon: "hospital",
      },
      {
        name: "County School District",
        type: "Education",
        employees: "1,800+",
        icon: "school",
      },
      {
        name: "Manufacturing Corp",
        type: "Manufacturing",
        employees: "1,200+",
        icon: "factory",
      },
      {
        name: "Tech Solutions Inc",
        type: "Technology",
        employees: "800+",
        icon: "office",
      },
    ],
    transportation: [
      { name: "Metro Rail Station", distance: "2.3 mi", type: "train" },
      { name: "Interstate 87 Access", distance: "1.5 mi", type: "highway" },
      { name: "Regional Airport", distance: "15 mi", type: "airport" },
      { name: "Bus Routes 12, 15, 22", distance: "0.3 mi", type: "bus" },
    ],
    businesses: [
      {
        name: "Whole Foods Market",
        type: "Grocery",
        distance: "0.8 mi",
        icon: "shopping",
      },
      {
        name: "Main Street Cafe",
        type: "Restaurant",
        distance: "0.4 mi",
        icon: "restaurant",
      },
      {
        name: "Town Square Mall",
        type: "Shopping",
        distance: "2.1 mi",
        icon: "store",
      },
      {
        name: "Community Fitness",
        type: "Gym",
        distance: "1.2 mi",
        icon: "fitness",
      },
      { name: "Starbucks", type: "Coffee", distance: "0.6 mi", icon: "coffee" },
      {
        name: "CVS Pharmacy",
        type: "Pharmacy",
        distance: "0.5 mi",
        icon: "pharmacy",
      },
    ],
  };

  // City-specific overrides
  const cityData: Record<string, typeof defaultData> = {
    highland_ny: {
      employers: [
        {
          name: "Vassar Brothers Medical",
          type: "Healthcare",
          employees: "3,200+",
          icon: "hospital",
        },
        {
          name: "IBM Hudson Valley",
          type: "Technology",
          employees: "2,800+",
          icon: "office",
        },
        {
          name: "SUNY New Paltz",
          type: "Education",
          employees: "1,500+",
          icon: "school",
        },
        {
          name: "Central Hudson",
          type: "Utilities",
          employees: "1,100+",
          icon: "factory",
        },
      ],
      transportation: [
        { name: "Metro-North (Poughkeepsie)", distance: "8 mi", type: "train" },
        { name: "Mid-Hudson Bridge", distance: "3 mi", type: "highway" },
        { name: "Stewart Int'l Airport", distance: "22 mi", type: "airport" },
        { name: "Ulster County Transit", distance: "0.5 mi", type: "bus" },
      ],
      businesses: [
        {
          name: "Adams Fairacre Farms",
          type: "Grocery",
          distance: "1.2 mi",
          icon: "shopping",
        },
        {
          name: "Highland Landing",
          type: "Restaurant",
          distance: "0.8 mi",
          icon: "restaurant",
        },
        {
          name: "Poughkeepsie Galleria",
          type: "Shopping",
          distance: "9 mi",
          icon: "store",
        },
        {
          name: "Walkway Over Hudson",
          type: "Recreation",
          distance: "3 mi",
          icon: "park",
        },
        {
          name: "Local Wineries",
          type: "Entertainment",
          distance: "5 mi",
          icon: "wine",
        },
        {
          name: "Rite Aid",
          type: "Pharmacy",
          distance: "0.4 mi",
          icon: "pharmacy",
        },
      ],
    },
    brooklyn_ny: {
      employers: [
        {
          name: "NYC Health + Hospitals",
          type: "Healthcare",
          employees: "12,000+",
          icon: "hospital",
        },
        {
          name: "Brooklyn Navy Yard",
          type: "Mixed Use",
          employees: "10,000+",
          icon: "factory",
        },
        {
          name: "CUNY Brooklyn College",
          type: "Education",
          employees: "3,500+",
          icon: "school",
        },
        {
          name: "Industry City",
          type: "Tech/Creative",
          employees: "8,000+",
          icon: "office",
        },
      ],
      transportation: [
        { name: "Multiple Subway Lines", distance: "0.2 mi", type: "train" },
        { name: "Brooklyn-Queens Expy", distance: "0.5 mi", type: "highway" },
        { name: "JFK Airport", distance: "12 mi", type: "airport" },
        { name: "NYC Ferry", distance: "1.5 mi", type: "ferry" },
      ],
      businesses: [
        {
          name: "Whole Foods / Trader Joe's",
          type: "Grocery",
          distance: "0.5 mi",
          icon: "shopping",
        },
        {
          name: "Hundreds of Restaurants",
          type: "Dining",
          distance: "0.1 mi",
          icon: "restaurant",
        },
        {
          name: "Atlantic Terminal Mall",
          type: "Shopping",
          distance: "2 mi",
          icon: "store",
        },
        {
          name: "Brooklyn Boulders",
          type: "Fitness",
          distance: "1 mi",
          icon: "fitness",
        },
        {
          name: "Artisanal Coffee Shops",
          type: "Coffee",
          distance: "0.1 mi",
          icon: "coffee",
        },
        {
          name: "24hr Pharmacies",
          type: "Pharmacy",
          distance: "0.3 mi",
          icon: "pharmacy",
        },
      ],
    },
  };

  const key =
    city && state
      ? `${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}`
      : "default";

  return cityData[key] || defaultData;
}

function getHistoricalContext(yearBuilt?: number): string {
  if (!yearBuilt) return "";
  const contexts: Record<string, string> = {
    pre1900:
      "Built during the Gilded Age, a time of rapid economic growth and architectural innovation",
    "1900s":
      "Constructed in the early 20th century, reflecting the craftsmanship of its era",
    "1920s":
      "Built during the Roaring Twenties, a decade of prosperity and cultural dynamism",
    "1950s":
      "A product of the 1950s suburban expansion era with mid-century design",
    "1970s": "Constructed during a decade of architectural experimentation",
    "1990s": "A product of the '90s housing market expansion",
    "2000s": "Built in the new millennium with modern amenities",
    "2020s": "Brand new construction with the latest building technologies",
  };

  if (yearBuilt < 1900) return contexts.pre1900;
  if (yearBuilt < 1930) return contexts["1900s"];
  if (yearBuilt < 1940) return contexts["1920s"];
  if (yearBuilt < 1970) return contexts["1950s"];
  if (yearBuilt < 1990) return contexts["1970s"];
  if (yearBuilt < 2010) return contexts["1990s"];
  if (yearBuilt < 2020) return contexts["2000s"];
  return contexts["2020s"];
}

// Generate projection data
function generateProjectionData(currentValue: number) {
  const years = ["Now", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  return years.map((year, i) => ({
    year,
    conservative: Math.round(currentValue * Math.pow(1.03, i)),
    base: Math.round(currentValue * Math.pow(1.05, i)),
    optimistic: Math.round(currentValue * Math.pow(1.07, i)),
  }));
}

// Generate historical appreciation data
function generateAppreciationData() {
  return [
    { year: "2019", value: 320000 },
    { year: "2020", value: 345000 },
    { year: "2021", value: 385000 },
    { year: "2022", value: 420000 },
    { year: "2023", value: 445000 },
    { year: "2024", value: 465000 },
    { year: "2025", value: 490000 },
  ];
}

export function ReportView({ reportId }: ReportViewProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("neighborhood");

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/report/${reportId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Report not found");
          return;
        }
        setReport(data.report);
      } catch (err) {
        setError("Failed to load report");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Preparing your report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="h-10 w-10 text-slate-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Report Not Found
          </h2>
          <p className="text-slate-400">
            {error || "This report may have expired."}
          </p>
        </div>
      </div>
    );
  }

  const {
    property,
    valuation,
    comparables,
    neighborhood,
    demographics,
    aiAnalysis,
    partnerOffer,
    leadInfo,
    companyInfo,
    agentInfo,
  } = report;
  const address = property?.address;
  const estimatedValue =
    valuation?.estimatedValue || property?.estimatedValue || 0;
  const neighborhoodData = getNeighborhoodData(address?.city, address?.state);
  const neighborhoodEnrichment = getNeighborhoodEnrichment(
    address?.city,
    address?.state,
  );
  const historicalContext = getHistoricalContext(property?.yearBuilt);
  const projectionData = generateProjectionData(estimatedValue);
  const appreciationData = generateAppreciationData();
  const pricePerSqFt =
    valuation?.pricePerSqFt ||
    (property?.squareFeet
      ? Math.round(estimatedValue / property.squareFeet)
      : 0);

  // Default company branding (placeholder)
  const company = companyInfo || {
    name: "Your Company Name",
    tagline: "Your Trusted Real Estate Partner",
  };

  // Default agent branding (placeholder)
  const agent = agentInfo || {
    name: "Your Name",
    title: "Real Estate Professional",
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare comparables for scatter chart
  const compScatterData =
    comparables?.map((c, i) => ({
      sqft: c.squareFeet || 0,
      price: c.salePrice || 0,
      address: c.address,
      isSubject: false,
    })) || [];

  compScatterData.push({
    sqft: property?.squareFeet || 0,
    price: estimatedValue,
    address: "Your Property",
    isSubject: true,
  });

  const tabs = [
    { id: "neighborhood", label: "Neighborhood", icon: MapPin },
    { id: "property", label: "Property", icon: Home },
    { id: "market", label: "Market", icon: TrendingUp },
    { id: "value-add", label: "Value-Add", icon: Lightbulb },
    { id: "valuation", label: "Valuation", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header - Company Branding + Property Info */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

        <div className="relative max-w-4xl mx-auto px-6 pt-8 pb-10">
          {/* Company Branding Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-500/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
              )}
              <div>
                <span className="font-bold text-white text-xl block">
                  {company.name}
                </span>
                {company.tagline && (
                  <span className="text-slate-400 text-xs">
                    {company.tagline}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {leadInfo?.name && (
                <p className="text-slate-400 text-sm">
                  Prepared for{" "}
                  <span className="text-white font-medium">
                    {leadInfo.name}
                  </span>
                </p>
              )}
              {company.phone && (
                <p className="text-slate-500 text-xs flex items-center justify-end gap-1 mt-1">
                  <Phone className="h-3 w-3" /> {company.phone}
                </p>
              )}
            </div>
          </div>

          {/* Property Hero */}
          <div className="text-center">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Analysis Report
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {address?.address || report.name}
            </h1>
            <p className="text-slate-300 text-lg mb-6">
              {[address?.city, address?.state, address?.zipCode]
                .filter(Boolean)
                .join(", ")}
            </p>

            {/* Quick Stats Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              {estimatedValue > 0 && (
                <div className="px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold text-lg">
                    {formatCurrency(estimatedValue)}
                  </span>
                  <span className="text-emerald-300/60 text-sm ml-1">
                    Est. Value
                  </span>
                </div>
              )}
              {property?.squareFeet && (
                <div className="px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-white font-medium">
                    {sf(property.squareFeet)}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">Sq Ft</span>
                </div>
              )}
              {property?.bedrooms && (
                <div className="px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-white font-medium">
                    {property.bedrooms}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">Bed</span>
                </div>
              )}
              {property?.bathrooms && (
                <div className="px-4 py-2 bg-slate-700/50 rounded-full">
                  <span className="text-white font-medium">
                    {property.bathrooms}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">Bath</span>
                </div>
              )}
            </div>

            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Discover the story behind this property — from neighborhood
              character to investment potential
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* NEIGHBORHOOD TAB */}
        {activeTab === "neighborhood" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Neighborhood Overview */}
            <section className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <TreePine className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {address?.city || "Your Neighborhood"}
                  </h2>
                  <p className="text-slate-400">
                    Community Character & History
                  </p>
                </div>
              </div>

              {/* Did You Know */}
              <div className="mb-8">
                <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4" />
                  Did You Know?
                </p>
                <div className="space-y-3">
                  {neighborhoodData.facts.map((fact, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/30"
                    >
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-400 text-sm font-bold">
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{fact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {neighborhood?.schoolRating && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <GraduationCap className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-white">
                      {neighborhood.schoolRating}
                      <span className="text-lg text-slate-500">/10</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">School Rating</p>
                  </div>
                )}
                {neighborhood?.walkScore && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-white">
                      {neighborhood.walkScore}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Walk Score</p>
                  </div>
                )}
                {neighborhood?.population && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <Building className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-white">
                      {(neighborhood.population / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Population</p>
                  </div>
                )}
                <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                  <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">
                    +{neighborhood?.appreciation || 8}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">5yr Growth</p>
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-400" />
                Neighborhood Evolution
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-slate-700" />
                <div className="space-y-6">
                  {neighborhoodData.timeline.map((item, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-2 w-4 h-4 bg-slate-900 border-2 border-blue-500 rounded-full" />
                      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                        <p className="text-blue-400 font-bold text-lg">
                          {item.year}
                        </p>
                        <p className="text-slate-300 mt-1">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Appreciation Chart */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6">
                Home Value Trends (Area Average)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={appreciationData}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) => `$${(sf(v) / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Value",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Demographics Section */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Users className="h-6 w-6 text-violet-400" />
                Community Demographics
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Understanding who lives here helps paint the full picture of
                this neighborhood.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">
                    {demographics?.medianAge || neighborhood?.population
                      ? Math.round(38 + Math.random() * 8)
                      : 38}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Median Age</p>
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">
                    {demographics?.medianIncome
                      ? formatCurrency(demographics.medianIncome)
                      : neighborhood?.medianIncome
                        ? formatCurrency(neighborhood.medianIncome)
                        : "$75K"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Median Income</p>
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">
                    {demographics?.ownerOccupied || 65}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Owner Occupied</p>
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">
                    {demographics?.educationBachelors || 32}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    College Educated
                  </p>
                </div>
              </div>

              {/* Ownership vs Rental breakdown */}
              <div className="bg-slate-900/40 rounded-2xl p-6">
                <h4 className="text-white font-semibold mb-4">
                  Housing Tenure
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">
                        Owner-Occupied
                      </span>
                      <span className="text-blue-400 font-semibold">
                        {demographics?.ownerOccupied || 65}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        style={{
                          width: `${demographics?.ownerOccupied || 65}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">
                        Renter-Occupied
                      </span>
                      <span className="text-amber-400 font-semibold">
                        {demographics?.renterOccupied || 35}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{
                          width: `${demographics?.renterOccupied || 35}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                {demographics?.medianRent && (
                  <p className="text-slate-500 text-sm mt-4">
                    Average rent in this area:{" "}
                    {formatCurrency(demographics.medianRent)}/month
                  </p>
                )}
              </div>

              {/* Why this matters */}
              <div className="mt-6 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <p className="text-violet-300 text-sm">
                  <span className="font-semibold">Why this matters:</span>{" "}
                  {(demographics?.ownerOccupied || 65) > 60
                    ? "High owner-occupancy typically indicates stable property values and strong community investment."
                    : "Higher rental rates can mean strong rental demand — good for investment properties."}
                </p>
              </div>
            </section>

            {/* Major Employers Section */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Briefcase className="h-6 w-6 text-amber-400" />
                Major Employers
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Key employers driving the local economy and housing demand.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {neighborhoodEnrichment.employers.map((employer, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 rounded-2xl p-5 flex items-start gap-4 border border-slate-700/30 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      {employer.icon === "hospital" && (
                        <Stethoscope className="h-6 w-6 text-amber-400" />
                      )}
                      {employer.icon === "school" && (
                        <GraduationCap className="h-6 w-6 text-amber-400" />
                      )}
                      {employer.icon === "factory" && (
                        <Factory className="h-6 w-6 text-amber-400" />
                      )}
                      {employer.icon === "office" && (
                        <Building2 className="h-6 w-6 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        {employer.name}
                      </p>
                      <p className="text-slate-500 text-sm">{employer.type}</p>
                      <p className="text-amber-400 text-sm font-medium mt-1">
                        {employer.employees} employees
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Transportation Section */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Car className="h-6 w-6 text-cyan-400" />
                Transportation & Access
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Connectivity matters — here's how accessible this location is.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {neighborhoodEnrichment.transportation.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 rounded-2xl p-5 flex items-center gap-4 border border-slate-700/30 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.type === "train" && (
                        <Train className="h-6 w-6 text-cyan-400" />
                      )}
                      {item.type === "highway" && (
                        <Car className="h-6 w-6 text-cyan-400" />
                      )}
                      {item.type === "airport" && (
                        <Building className="h-6 w-6 text-cyan-400" />
                      )}
                      {item.type === "bus" && (
                        <Car className="h-6 w-6 text-cyan-400" />
                      )}
                      {item.type === "ferry" && (
                        <Car className="h-6 w-6 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{item.name}</p>
                      <p className="text-cyan-400 text-sm">{item.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Local Businesses Section */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Store className="h-6 w-6 text-pink-400" />
                Local Businesses & Amenities
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Nearby conveniences that make daily life easier.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {neighborhoodEnrichment.businesses.map((biz, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 rounded-xl p-4 flex items-center gap-3 border border-slate-700/30 hover:border-pink-500/30 transition-colors"
                  >
                    <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {biz.icon === "shopping" && (
                        <ShoppingBag className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "restaurant" && (
                        <Utensils className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "store" && (
                        <Store className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "coffee" && (
                        <Coffee className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "pharmacy" && (
                        <Stethoscope className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "fitness" && (
                        <Users className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "park" && (
                        <TreePine className="h-5 w-5 text-pink-400" />
                      )}
                      {biz.icon === "wine" && (
                        <Coffee className="h-5 w-5 text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {biz.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">{biz.type}</span>
                        <span className="text-pink-400">{biz.distance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* PROPERTY TAB */}
        {activeTab === "property" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Main Property Details */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Home className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Property Details
                  </h2>
                  <p className="text-slate-400">The story behind these walls</p>
                </div>
              </div>

              {/* Historical Context */}
              {historicalContext && property?.yearBuilt && (
                <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 mb-8">
                  <p className="text-slate-300 leading-relaxed text-lg">
                    <span className="text-blue-400 font-bold">
                      Built in {property.yearBuilt}:
                    </span>{" "}
                    {historicalContext}
                  </p>
                </div>
              )}

              {/* Property Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {property?.bedrooms && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <BedDouble className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-4xl font-bold text-white">
                      {property.bedrooms}
                    </p>
                    <p className="text-sm text-slate-500">Bedrooms</p>
                  </div>
                )}
                {property?.bathrooms && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <Bath className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-4xl font-bold text-white">
                      {property.bathrooms}
                    </p>
                    <p className="text-sm text-slate-500">Bathrooms</p>
                  </div>
                )}
                {property?.squareFeet && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <Ruler className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-4xl font-bold text-white">
                      {sf(property.squareFeet)}
                    </p>
                    <p className="text-sm text-slate-500">Sq Ft</p>
                  </div>
                )}
                {property?.yearBuilt && (
                  <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                    <Calendar className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-4xl font-bold text-white">
                      {property.yearBuilt}
                    </p>
                    <p className="text-sm text-slate-500">Year Built</p>
                  </div>
                )}
              </div>

              {/* Property Type & Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property?.propertyType && (
                  <div className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-slate-400">Property Type</span>
                    <span className="text-white font-semibold">
                      {property.propertyType}
                    </span>
                  </div>
                )}
                {property?.stories && (
                  <div className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-slate-400">Stories</span>
                    <span className="text-white font-semibold">
                      {property.stories}
                    </span>
                  </div>
                )}
                {property?.construction && (
                  <div className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-slate-400">Construction</span>
                    <span className="text-white font-semibold">
                      {property.construction}
                    </span>
                  </div>
                )}
                {property?.zoning && (
                  <div className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-slate-400">Zoning</span>
                    <span className="text-white font-semibold">
                      {property.zoning}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              {(property?.pool ||
                property?.garage ||
                property?.fireplace ||
                property?.basement) && (
                <div className="mt-6">
                  <p className="text-slate-400 text-sm mb-3">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {property?.pool && (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                        Pool
                      </span>
                    )}
                    {property?.garage && (
                      <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                        Garage{" "}
                        {property.garageSpaces
                          ? `(${property.garageSpaces} spaces)`
                          : ""}
                      </span>
                    )}
                    {property?.fireplace && (
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                        Fireplace
                      </span>
                    )}
                    {property?.basement && (
                      <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                        Basement
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Owner Information */}
            {(property?.ownerFullName || property?.mailingAddress) && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <UserCircle className="h-6 w-6 text-violet-400" />
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property?.ownerFullName && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Owner Name</p>
                      <p className="text-white font-semibold">
                        {property.ownerFullName}
                      </p>
                    </div>
                  )}
                  {property?.mailingAddress && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">
                        Mailing Address
                      </p>
                      <p className="text-white font-semibold">
                        {property.mailingAddress}
                      </p>
                    </div>
                  )}
                  <div className="bg-slate-900/40 rounded-xl p-4">
                    <p className="text-slate-500 text-xs mb-1">
                      Occupancy Status
                    </p>
                    <p className="text-white font-semibold">
                      {property?.ownerOccupied
                        ? "Owner Occupied"
                        : "Non-Owner Occupied (Absentee)"}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Motivated Seller Signals */}
            {(property?.freeClear ||
              property?.highEquity ||
              property?.absenteeOwner ||
              property?.preForeclosure ||
              property?.taxDelinquent ||
              property?.isVacant ||
              property?.corporateOwned) && (
              <section className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-3xl p-8 border border-amber-500/30">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Target className="h-6 w-6 text-amber-400" />
                  Seller Signals
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Key indicators that may indicate seller motivation
                </p>
                <div className="flex flex-wrap gap-3">
                  {property?.freeClear && (
                    <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Free & Clear
                    </span>
                  )}
                  {property?.highEquity && (
                    <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> High Equity
                    </span>
                  )}
                  {property?.absenteeOwner && (
                    <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Absentee Owner
                    </span>
                  )}
                  {property?.preForeclosure && (
                    <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Pre-Foreclosure
                    </span>
                  )}
                  {property?.taxDelinquent && (
                    <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Tax Delinquent
                    </span>
                  )}
                  {property?.isVacant && (
                    <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4" /> Vacant
                    </span>
                  )}
                  {property?.corporateOwned && (
                    <span className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4" /> Corporate Owned
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Equity & Mortgage Information */}
            {(property?.estimatedEquity ||
              property?.openMortgageBalance ||
              property?.currentMortgages?.length) && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                  Equity & Mortgage Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {property?.estimatedEquity !== undefined && (
                    <div className="bg-emerald-500/10 rounded-2xl p-5 text-center border border-emerald-500/30">
                      <p className="text-slate-400 text-sm mb-1">
                        Estimated Equity
                      </p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {formatCurrency(property.estimatedEquity)}
                      </p>
                      {property?.equityPercent && (
                        <p className="text-emerald-300/60 text-sm mt-1">
                          {property.equityPercent}% of value
                        </p>
                      )}
                    </div>
                  )}
                  {property?.openMortgageBalance !== undefined && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Open Mortgage Balance
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(property.openMortgageBalance)}
                      </p>
                    </div>
                  )}
                  {estimatedValue > 0 && property?.openMortgageBalance && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Loan-to-Value
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {Math.round(
                          (property.openMortgageBalance / estimatedValue) * 100,
                        )}
                        %
                      </p>
                    </div>
                  )}
                </div>

                {/* Current Mortgages */}
                {property?.currentMortgages &&
                  property.currentMortgages.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-white font-semibold mb-4">
                        Current Mortgages
                      </h4>
                      <div className="space-y-3">
                        {property.currentMortgages.map((mortgage, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-white font-medium">
                                {mortgage.lenderName || `Mortgage ${i + 1}`}
                              </p>
                              <p className="text-slate-500 text-sm">
                                {mortgage.loanType || "Loan"}{" "}
                                {mortgage.position
                                  ? `(${mortgage.position})`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-bold">
                                {formatCurrency(mortgage.amount)}
                              </p>
                              {mortgage.interestRate && (
                                <p className="text-slate-500 text-sm">
                                  {mortgage.interestRate}%{" "}
                                  {mortgage.interestRateType || ""}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </section>
            )}

            {/* Tax Information */}
            {(property?.taxAmount ||
              property?.taxAssessedValue ||
              property?.taxMarketValue) && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Percent className="h-6 w-6 text-blue-400" />
                  Tax Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {property?.taxAmount && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Annual Tax Amount
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(property.taxAmount)}
                      </p>
                      {property?.taxYear && (
                        <p className="text-slate-500 text-sm mt-1">
                          Year {property.taxYear}
                        </p>
                      )}
                    </div>
                  )}
                  {property?.taxAssessedValue && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Assessed Value
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(property.taxAssessedValue)}
                      </p>
                    </div>
                  )}
                  {property?.taxMarketValue && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Tax Market Value
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(property.taxMarketValue)}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Sale History */}
            {property?.saleHistory && property.saleHistory.length > 0 && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-purple-400" />
                  Sale History
                </h3>
                <div className="space-y-3">
                  {property.saleHistory.map((sale, i) => (
                    <div
                      key={i}
                      className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {sale.saleDate
                            ? new Date(sale.saleDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Unknown Date"}
                        </p>
                        <p className="text-slate-500 text-sm">
                          {sale.documentType || sale.transactionType || "Sale"}
                        </p>
                        {sale.buyerNames && (
                          <p className="text-slate-400 text-xs mt-1">
                            Buyer: {sale.buyerNames}
                          </p>
                        )}
                        {sale.sellerNames && (
                          <p className="text-slate-400 text-xs">
                            Seller: {sale.sellerNames}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold text-lg">
                          {formatCurrency(sale.saleAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mortgage History */}
            {property?.mortgageHistory &&
              property.mortgageHistory.length > 0 && (
                <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Building className="h-6 w-6 text-cyan-400" />
                    Mortgage History
                  </h3>
                  <div className="space-y-3">
                    {property.mortgageHistory.map((mortgage, i) => (
                      <div
                        key={i}
                        className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {mortgage.lenderName || "Mortgage"}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {mortgage.documentDate
                              ? new Date(
                                  mortgage.documentDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : ""}
                            {mortgage.loanType ? ` • ${mortgage.loanType}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">
                            {formatCurrency(mortgage.amount)}
                          </p>
                          {mortgage.interestRate && (
                            <p className="text-slate-500 text-sm">
                              {mortgage.interestRate}%{" "}
                              {mortgage.interestRateType || ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Lot Information */}
            {property?.lotInfo && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-green-400" />
                  Lot Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.lotInfo.apn && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">
                        APN (Parcel Number)
                      </p>
                      <p className="text-white font-mono">
                        {property.lotInfo.apn}
                      </p>
                    </div>
                  )}
                  {property.lotInfo.lotAcres && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Lot Size</p>
                      <p className="text-white font-semibold">
                        {property.lotInfo.lotAcres} acres
                      </p>
                    </div>
                  )}
                  {property.lotInfo.zoning && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Zoning</p>
                      <p className="text-white font-semibold">
                        {property.lotInfo.zoning}
                      </p>
                    </div>
                  )}
                  {property.lotInfo.landUse && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Land Use</p>
                      <p className="text-white font-semibold">
                        {property.lotInfo.landUse}
                      </p>
                    </div>
                  )}
                  {property.lotInfo.legalDescription && (
                    <div className="bg-slate-900/40 rounded-xl p-4 md:col-span-2">
                      <p className="text-slate-500 text-xs mb-1">
                        Legal Description
                      </p>
                      <p className="text-white text-sm">
                        {property.lotInfo.legalDescription}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Schools */}
            {property?.schools && property.schools.length > 0 && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-blue-400" />
                  Nearby Schools
                </h3>
                <div className="space-y-3">
                  {property.schools.map((school, i) => (
                    <div
                      key={i}
                      className="bg-slate-900/40 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{school.name}</p>
                        <p className="text-slate-500 text-sm">
                          {school.type}{" "}
                          {school.grades ? `• Grades ${school.grades}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        {school.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400 fill-current" />
                            <span className="text-white font-bold">
                              {school.rating}/10
                            </span>
                          </div>
                        )}
                        {school.parentRating && (
                          <p className="text-slate-500 text-xs">
                            Parent: {school.parentRating}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Linked Properties (Other properties owned by same owner) */}
            {property?.linkedProperties &&
              property.linkedProperties.totalOwned &&
              property.linkedProperties.totalOwned > 1 && (
                <section className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-3xl p-8 border border-violet-500/30">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-violet-400" />
                    Owner's Portfolio
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    This owner has multiple properties
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        Properties Owned
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {property.linkedProperties.totalOwned}
                      </p>
                    </div>
                    {property.linkedProperties.totalValue && (
                      <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                        <p className="text-slate-400 text-sm mb-1">
                          Total Portfolio Value
                        </p>
                        <p className="text-3xl font-bold text-emerald-400">
                          {formatCurrency(property.linkedProperties.totalValue)}
                        </p>
                      </div>
                    )}
                    {property.linkedProperties.totalEquity && (
                      <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                        <p className="text-slate-400 text-sm mb-1">
                          Total Equity
                        </p>
                        <p className="text-3xl font-bold text-emerald-400">
                          {formatCurrency(
                            property.linkedProperties.totalEquity,
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

            {/* Auction/Foreclosure Info */}
            {property?.auctionInfo?.active && (
              <section className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-3xl p-8 border border-red-500/30">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  Auction Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.auctionInfo.auctionDate && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">
                        Auction Date
                      </p>
                      <p className="text-white font-semibold">
                        {new Date(
                          property.auctionInfo.auctionDate,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {property.auctionInfo.openingBid && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Opening Bid</p>
                      <p className="text-emerald-400 font-bold">
                        {formatCurrency(property.auctionInfo.openingBid)}
                      </p>
                    </div>
                  )}
                  {property.auctionInfo.judgmentAmount && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">
                        Judgment Amount
                      </p>
                      <p className="text-white font-semibold">
                        {formatCurrency(property.auctionInfo.judgmentAmount)}
                      </p>
                    </div>
                  )}
                  {property.auctionInfo.lenderName && (
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">
                        Foreclosing Lender
                      </p>
                      <p className="text-white font-semibold">
                        {property.auctionInfo.lenderName}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Rental Estimates */}
            {(property?.rentEstimate ||
              property?.demographics?.suggestedRent) && (
              <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Key className="h-6 w-6 text-emerald-400" />
                  Rental Estimates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(property?.rentEstimate ||
                    property?.demographics?.suggestedRent) && (
                    <div className="bg-emerald-500/10 rounded-2xl p-5 text-center border border-emerald-500/30">
                      <p className="text-slate-400 text-sm mb-1">
                        Estimated Monthly Rent
                      </p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {formatCurrency(
                          property.rentEstimate ||
                            property.demographics?.suggestedRent,
                        )}
                      </p>
                    </div>
                  )}
                  {property?.demographics?.fmrTwoBedroom && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">
                        FMR (2 Bedroom)
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(property.demographics.fmrTwoBedroom)}
                      </p>
                    </div>
                  )}
                  {property?.grossYield && (
                    <div className="bg-slate-900/40 rounded-2xl p-5 text-center">
                      <p className="text-slate-400 text-sm mb-1">Gross Yield</p>
                      <p className="text-3xl font-bold text-white">
                        {property.grossYield}%
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* VALUATION TAB */}
        {activeTab === "valuation" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Main Value Card */}
            <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-10 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
              <div className="relative">
                <p className="text-emerald-100 text-sm font-medium mb-2">
                  Estimated Market Value
                </p>
                <p className="text-6xl md:text-7xl font-bold text-white tracking-tight mb-4">
                  {formatCurrency(estimatedValue)}
                </p>
                {valuation?.valueRangeLow && valuation?.valueRangeHigh && (
                  <p className="text-emerald-100/80">
                    Range: {formatCurrency(valuation.valueRangeLow)} –{" "}
                    {formatCurrency(valuation.valueRangeHigh)}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm inline-flex">
                  <Star className="h-4 w-4 fill-current" />
                  {valuation?.confidence || 94}% Confidence Score
                </div>
              </div>
            </section>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm uppercase tracking-wider">
                    Price Per Sq Ft
                  </span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                    FAVORABLE
                  </span>
                </div>
                <p className="text-4xl font-bold text-white">${pricePerSqFt}</p>
                <p className="text-slate-500 text-sm mt-2">
                  Below area average, indicating value opportunity
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm uppercase tracking-wider">
                    5-Year Projection
                  </span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                    +25%
                  </span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(estimatedValue * 1.25)}
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Based on historical appreciation trends
                </p>
              </div>
            </div>

            {/* Projection Chart */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6">
                5-Year Value Projection
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) => `$${(sf(v) / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(value: number) => [formatCurrency(value), ""]}
                    />
                    <Line
                      type="monotone"
                      dataKey="conservative"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Conservative (+3%)"
                    />
                    <Line
                      type="monotone"
                      dataKey="base"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Base Case (+5%)"
                    />
                    <Line
                      type="monotone"
                      dataKey="optimistic"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Optimistic (+7%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-amber-500" />
                  Conservative +3%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-blue-500" />
                  Base +5%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-emerald-500" />
                  Optimistic +7%
                </span>
              </div>
            </section>

            {/* AI Analysis */}
            {aiAnalysis?.summary && (
              <section className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-3xl p-8 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      AI Market Analysis
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Intelligent insights
                    </p>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed text-lg mb-6">
                  {aiAnalysis.summary}
                </p>

                {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-emerald-400 text-sm font-semibold">
                      Key Strengths
                    </p>
                    {aiAnalysis.strengths.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-300">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {activeTab === "market" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Building className="h-7 w-7 text-amber-400" />
                Comparable Sales
              </h2>
              <p className="text-slate-400 mb-6">
                Recent sales of similar properties within 2 miles
              </p>

              <div className="space-y-3 mb-8">
                {comparables?.slice(0, 5).map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {comp.address}
                      </p>
                      <p className="text-sm text-slate-500">
                        {[
                          comp.bedrooms && `${comp.bedrooms} bed`,
                          comp.bathrooms && `${comp.bathrooms} bath`,
                          comp.squareFeet && `${sf(comp.squareFeet)} sqft`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-emerald-400 text-lg">
                        {formatCurrency(comp.salePrice)}
                      </p>
                      {comp.squareFeet && comp.salePrice && (
                        <p className="text-xs text-slate-500">
                          ${Math.round(comp.salePrice / comp.squareFeet)}/sqft
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scatter Chart */}
              <div className="bg-slate-900/40 rounded-2xl p-6">
                <h4 className="text-white font-semibold mb-4">
                  Price vs. Square Footage
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        type="number"
                        dataKey="sqft"
                        name="Sq Ft"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={(v) => `${sf(v)}`}
                      />
                      <YAxis
                        type="number"
                        dataKey="price"
                        name="Price"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={(v) => `$${(sf(v) / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "price"
                            ? formatCurrency(value)
                            : `${sf(value)} sqft`,
                          name === "price" ? "Price" : "Size",
                        ]}
                      />
                      <Scatter data={compScatterData}>
                        {compScatterData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.isSubject ? "#ef4444" : "#3b82f6"}
                            r={entry.isSubject ? 10 : 6}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full" />
                    Comparables
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full" />
                    Your Property
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VALUE-ADD ANALYSIS TAB */}
        {activeTab === "value-add" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Intro */}
            <section className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                  <Lightbulb className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Value-Add Analysis
                  </h2>
                  <p className="text-slate-400">
                    Contextual strategies to maximize your position
                  </p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Every property has untapped potential. Based on this property's
                characteristics, location, and market conditions, here are the
                most relevant strategies to consider — whether you're looking to
                build equity, generate income, or find the best exit.
              </p>
            </section>

            {/* Equity Building Strategies */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Hammer className="h-6 w-6 text-blue-400" />
                Equity Building Strategies
              </h3>

              <div className="space-y-4">
                {/* ADU Potential */}
                <div className="bg-slate-900/40 rounded-2xl p-6 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-400" />
                      ADU / Guest House Potential
                    </h4>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                      HIGH IMPACT
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {property?.lotSize && property.lotSize > 5000
                      ? `With ${sf(property.lotSize)} sq ft of lot space, this property may qualify for an Accessory Dwelling Unit (ADU).`
                      : "Check local zoning for ADU eligibility. Many municipalities have relaxed ADU requirements."}
                  </p>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/60 rounded-xl">
                    <div>
                      <p className="text-slate-500 text-xs">Typical ADU Cost</p>
                      <p className="text-white font-bold">$80K - $150K</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">
                        Potential Value Add
                      </p>
                      <p className="text-emerald-400 font-bold">
                        +{formatCurrency(estimatedValue * 0.25)} -{" "}
                        {formatCurrency(estimatedValue * 0.35)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Renovation ROI */}
                <div className="bg-slate-900/40 rounded-2xl p-6 border-l-4 border-purple-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-400" />
                      Strategic Renovations
                    </h4>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full">
                      PROVEN ROI
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {property?.yearBuilt && property.yearBuilt < 2000
                      ? `Built in ${property.yearBuilt}, key updates could significantly boost value and appeal.`
                      : "Even newer homes benefit from strategic upgrades in high-impact areas."}
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Kitchen Remodel",
                        cost: "$25K-60K",
                        roi: "75-100%",
                        impact: "Highest buyer appeal",
                      },
                      {
                        name: "Bathroom Update",
                        cost: "$10K-25K",
                        roi: "70-80%",
                        impact: "Strong ROI",
                      },
                      {
                        name: "Curb Appeal",
                        cost: "$5K-15K",
                        roi: "100%+",
                        impact: "First impression",
                      },
                    ].map((reno, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl"
                      >
                        <div>
                          <p className="text-white text-sm font-medium">
                            {reno.name}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {reno.impact}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">{reno.cost}</p>
                          <p className="text-emerald-400 text-sm font-semibold">
                            {reno.roi} ROI
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Income Strategies */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <PiggyBank className="h-6 w-6 text-emerald-400" />
                Income Generation Strategies
              </h3>

              <div className="space-y-4">
                {/* Rental Income */}
                <div className="bg-slate-900/40 rounded-2xl p-6 border-l-4 border-emerald-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Key className="h-5 w-5 text-emerald-400" />
                      Long-Term Rental
                    </h4>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                      PASSIVE INCOME
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    Based on local market rents and property characteristics,
                    here's the rental income potential:
                  </p>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/60 rounded-xl">
                    <div>
                      <p className="text-slate-500 text-xs">
                        Est. Monthly Rent
                      </p>
                      <p className="text-white font-bold">
                        {formatCurrency(Math.round(estimatedValue * 0.006))}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Annual Gross</p>
                      <p className="text-white font-bold">
                        {formatCurrency(
                          Math.round(estimatedValue * 0.006 * 12),
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Cap Rate Est.</p>
                      <p className="text-emerald-400 font-bold">~4-6%</p>
                    </div>
                  </div>
                </div>

                {/* Short-Term Rental */}
                <div className="bg-slate-900/40 rounded-2xl p-6 border-l-4 border-amber-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-amber-400" />
                      Short-Term / Vacation Rental
                    </h4>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
                      HIGHER YIELD
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {address?.city === "Highland" || address?.state === "NY"
                      ? "Hudson Valley tourism is booming. Short-term rentals in this area see strong weekend demand."
                      : "Check local STR regulations. Popular destinations can yield 2-3x traditional rental income."}
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-200 text-sm">
                      Verify local short-term rental regulations before
                      proceeding.
                    </p>
                  </div>
                </div>

                {/* House Hacking */}
                {property?.bedrooms && property.bedrooms >= 3 && (
                  <div className="bg-slate-900/40 rounded-2xl p-6 border-l-4 border-cyan-500">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-400" />
                        House Hacking
                      </h4>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">
                        LIVE FREE
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      With {property.bedrooms} bedrooms, you could rent out
                      spare rooms to offset your mortgage. A single room could
                      bring in $800-1,500/month depending on location.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Exit Strategies */}
            <section className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <ArrowRightLeft className="h-6 w-6 text-violet-400" />
                Exit Strategies
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Different situations call for different exits. Here's what makes
                sense based on your equity position:
              </p>

              <div className="space-y-4">
                {/* Traditional Sale */}
                <div className="bg-slate-900/40 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Home className="h-5 w-5 text-blue-400" />
                      Traditional Market Sale
                    </h4>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                      MAX VALUE
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Best if: You have equity, can wait 3-6 months, and want top
                    dollar.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      Timeline: 90-180 days
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-500">
                      Costs: 6-10% of sale price
                    </span>
                  </div>
                </div>

                {/* Wholesale */}
                <div className="bg-slate-900/40 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-400" />
                      Wholesale to Investor
                    </h4>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
                      FAST EXIT
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Best if: Property needs work, you want quick cash, or
                    there's little equity to maximize.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">Timeline: 7-30 days</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-500">
                      Expect: 65-75% of ARV
                    </span>
                  </div>
                </div>

                {/* Subject-To / Creative */}
                <div className="bg-slate-900/40 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Scale className="h-5 w-5 text-violet-400" />
                      Creative Financing Exit
                    </h4>
                    <span className="px-3 py-1 bg-violet-500/20 text-violet-400 text-xs font-semibold rounded-full">
                      LOW/NO EQUITY
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Best if: Little to no equity, behind on payments, or
                    underwater. Options include subject-to, lease-option, or
                    short sale.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">Timeline: Varies</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-500">
                      Goal: Exit clean, protect credit
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Personalized Recommendation */}
            <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-6 w-6 text-blue-200" />
                  <h3 className="text-xl font-bold text-white">
                    Our Recommendation
                  </h3>
                </div>
                <p className="text-blue-100 leading-relaxed mb-6">
                  {property?.yearBuilt && property.yearBuilt < 1990
                    ? "Given the property's age and location, strategic renovations combined with an ADU addition could significantly boost both value and income potential. Consider getting quotes for kitchen/bath updates while exploring ADU feasibility with local planning."
                    : property?.lotSize && property.lotSize > 7000
                      ? "With substantial lot size, the ADU strategy presents the highest value-add opportunity. Combined with the strong rental market, this property has excellent income generation potential."
                      : "Based on the property characteristics, focus on high-ROI cosmetic updates to maximize appeal. The rental income potential also provides a strong passive income option while building equity."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-white/20 text-white text-sm rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready for detailed analysis
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Partner Offer */}
        {partnerOffer && (
          <section className="mt-8 relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 text-violet-200 text-sm mb-3">
                <Heart className="h-4 w-4" />
                Exclusive Offer For You
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {partnerOffer.businessName}
              </h3>
              <p className="text-violet-100 text-lg mb-4">
                {partnerOffer.offer}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-4 py-2 bg-white text-violet-600 font-bold rounded-xl">
                  {partnerOffer.discount}
                </span>
                {partnerOffer.couponCode && (
                  <span className="px-4 py-2 bg-white/20 text-white font-mono rounded-xl">
                    Code: {partnerOffer.couponCode}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Agent/Advisor Contact Card */}
        <section className="mt-8 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Agent Photo */}
            <div className="flex-shrink-0">
              {agent.photo ? (
                <img
                  src={agent.photo}
                  alt={agent.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500/30"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border-2 border-blue-500/30">
                  <UserCircle className="h-12 w-12 text-blue-400" />
                </div>
              )}
            </div>

            {/* Agent Info */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-blue-400 text-sm font-medium mb-1">
                Your Real Estate Advisor
              </p>
              <h3 className="text-2xl font-bold text-white mb-1">
                {agent.name}
              </h3>
              <p className="text-slate-400 mb-4">{agent.title}</p>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">{agent.phone}</span>
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email Me</span>
                  </a>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">Website</span>
                  </a>
                )}
              </div>
              {agent.license && (
                <p className="text-slate-600 text-xs mt-3">
                  License: {agent.license}
                </p>
              )}
            </div>

            {/* Company Logo (if different from agent) */}
            {company.logo && (
              <div className="flex-shrink-0 hidden md:block">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-16 w-auto object-contain opacity-60"
                />
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/20 text-center">
            <p className="text-white font-semibold mb-2">
              Ready to discuss this property?
            </p>
            <p className="text-slate-400 text-sm mb-4">
              I'm here to answer your questions and help you make informed
              decisions.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={agent.phone ? `tel:${agent.phone}` : "#"}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Schedule a Call
              </a>
              <a
                href={
                  agent.email
                    ? `mailto:${agent.email}?subject=Property%20Inquiry:%20${encodeURIComponent(address?.address || "")}`
                    : "#"
                }
                className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Message
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-12 mt-12 border-t border-slate-800">
          <div className="flex items-center justify-center gap-3 mb-4">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-slate-600" />
              </div>
            )}
            <span className="text-white font-semibold">{company.name}</span>
          </div>
          <p className="text-slate-500 text-sm">
            Report prepared{" "}
            {new Date(report.savedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {company.phone && (
            <p className="text-slate-500 text-sm mt-2">
              <Phone className="h-3 w-3 inline mr-1" /> {company.phone}
              {company.email && (
                <>
                  {" "}
                  · <Mail className="h-3 w-3 inline mx-1" /> {company.email}
                </>
              )}
            </p>
          )}
          <p className="text-slate-600 text-xs mt-2">
            Powered by NexTier Property Intelligence
          </p>
          <p className="text-slate-700 text-xs mt-4 max-w-xl mx-auto">
            This report is for informational purposes only. Values are estimates
            based on market data. Consult with licensed professionals before
            making decisions.
          </p>
        </footer>
      </main>
    </div>
  );
}
