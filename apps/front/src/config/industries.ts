/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY INDEX - All Verticals
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Campaign verticals that flow through THE LOOP.
 * Each industry has unique personas, messaging, and value props.
 *
 * Categories:
 * - B2B: Business decision makers
 * - REAL_ESTATE: Property professionals
 * - HOME_SERVICES: Contractors and service providers
 * - TRUCKING: Transportation and logistics
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Industry {
  id: string;
  name: string;
  category: "B2B" | "REAL_ESTATE" | "HOME_SERVICES" | "TRUCKING" | "OTHER";
  description: string;
  avgJobValue?: { min: number; max: number };
  titles: string[];
  painPoints: string[];
  valueProps: string[];
  smsOpener: string;
  leadSources: string[];
  enrichmentProviders: ("tracerfy" | "apollo" | "usbizdata" | "fastappend")[];
}

export interface LeadSource {
  id: string;
  name: string;
  type: "csv_import" | "api" | "scrape" | "manual";
  provider: string;
  costPerLead?: number;
  industries: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// B2B INDUSTRIES
// ═══════════════════════════════════════════════════════════════════════════════

export const B2B_INDUSTRIES: Industry[] = [
  {
    id: "b2b_tech",
    name: "Technology Companies",
    category: "B2B",
    description: "SaaS, IT Services, Software Development",
    titles: ["CEO", "CTO", "VP Engineering", "Founder", "Tech Lead"],
    painPoints: ["Lead generation", "Sales pipeline", "Scaling teams"],
    valueProps: ["20+ hrs/week saved", "Predictable pipeline", "Scale without hiring"],
    smsOpener: "Hi {firstName}, quick q - are you still handling outbound manually? Built something that saves tech CEOs 20+ hrs/week. Worth a look? -Emily",
    leadSources: ["apollo", "usbizdata"],
    enrichmentProviders: ["apollo", "fastappend"],
  },
  {
    id: "b2b_marketing",
    name: "Marketing Agencies",
    category: "B2B",
    description: "Digital Marketing, Advertising, PR Agencies",
    titles: ["Agency Owner", "CMO", "Marketing Director", "Account Director"],
    painPoints: ["Client acquisition", "Lead quality", "CAC"],
    valueProps: ["Lower CAC", "More qualified leads", "White-label solutions"],
    smsOpener: "Hi {firstName}, curious - how's your agency handling client acquisition right now? Have something that's working great for agencies. Quick call? -Emily",
    leadSources: ["apollo", "usbizdata"],
    enrichmentProviders: ["apollo", "fastappend"],
  },
  {
    id: "b2b_sales",
    name: "Sales Organizations",
    category: "B2B",
    description: "Sales Teams, BDR/SDR Operations",
    titles: ["VP Sales", "Sales Director", "CRO", "Head of Sales"],
    painPoints: ["Pipeline", "Conversion rates", "Rep productivity"],
    valueProps: ["Scale outbound", "Book more meetings", "Predictable revenue"],
    smsOpener: "Hi {firstName}, quick q - is your team still doing manual outbound? Built a system that books meetings on autopilot. 15 min to show you? -Emily",
    leadSources: ["apollo", "usbizdata"],
    enrichmentProviders: ["apollo", "fastappend"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REAL ESTATE INDUSTRIES
// ═══════════════════════════════════════════════════════════════════════════════

export const REAL_ESTATE_INDUSTRIES: Industry[] = [
  {
    id: "re_agents",
    name: "Real Estate Agents",
    category: "REAL_ESTATE",
    description: "Residential and Commercial Agents, Brokers",
    titles: ["Real Estate Agent", "Realtor", "Broker", "Associate Broker"],
    painPoints: ["Lead generation", "Follow-up", "Time management"],
    valueProps: ["More listings", "Automated follow-up", "Never miss a lead"],
    smsOpener: "Hi {firstName}! Curious - how are you finding new listings right now? Have a system that's working great for agents. Want to see? -Emily",
    leadSources: ["tracerfy", "usbizdata"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "re_investors",
    name: "Real Estate Investors",
    category: "REAL_ESTATE",
    description: "Property Investors, Flippers, Landlords",
    titles: ["Real Estate Investor", "Property Owner", "Landlord", "Developer"],
    painPoints: ["Deal flow", "Off-market deals", "Seller outreach"],
    valueProps: ["Off-market deals", "Seller outreach at scale", "Beat competition"],
    smsOpener: "Hi {firstName}, you invest in properties right? Built something for off-market seller outreach at scale. Interested? -Emily",
    leadSources: ["tracerfy", "usbizdata"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "re_property_managers",
    name: "Property Managers",
    category: "REAL_ESTATE",
    description: "Property Management Companies",
    titles: ["Property Manager", "Portfolio Manager", "Operations Director"],
    painPoints: ["Tenant communication", "Owner relations", "Vacancy"],
    valueProps: ["Automated outreach", "Fill vacancies faster", "Owner retention"],
    smsOpener: "Hi {firstName}, managing properties right? Built a system that helps PMs fill vacancies faster. Quick call? -Emily",
    leadSources: ["tracerfy", "usbizdata"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SERVICES INDUSTRIES (Tracerfy Integration)
// ═══════════════════════════════════════════════════════════════════════════════

export const HOME_SERVICES_INDUSTRIES: Industry[] = [
  {
    id: "home_roofing",
    name: "Roofing",
    category: "HOME_SERVICES",
    description: "Roof repair, replacement, storm damage",
    avgJobValue: { min: 8000, max: 15000 },
    titles: ["Roofing Contractor", "Owner", "Estimator", "Project Manager"],
    painPoints: ["Lead generation", "Storm chasing competition", "Seasonality"],
    valueProps: ["Exclusive leads", "Pre-qualified homeowners", "50-70% close rates"],
    smsOpener: "Hi {firstName}, running a roofing company right? Got exclusive homeowner leads looking for roof work in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_kitchen",
    name: "Kitchen Remodeling",
    category: "HOME_SERVICES",
    description: "Kitchen upgrades, cabinets, countertops, full remodels",
    avgJobValue: { min: 15000, max: 50000 },
    titles: ["Kitchen Remodeler", "Owner", "Designer", "Project Manager"],
    painPoints: ["High ticket sales cycle", "Lead quality", "Competition"],
    valueProps: ["Pre-qualified leads", "Live transfers", "Higher close rates"],
    smsOpener: "Hi {firstName}, you do kitchen remodels right? Got homeowners actively planning kitchen projects in your area. Quick call? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_windows",
    name: "Window Replacement",
    category: "HOME_SERVICES",
    description: "Energy-efficient windows, vinyl installs, replacement glass",
    avgJobValue: { min: 7500, max: 20000 },
    titles: ["Window Installer", "Owner", "Sales Rep", "Estimator"],
    painPoints: ["Lead quality", "No-shows", "Price shoppers"],
    valueProps: ["Pre-qualified for budget", "Timeline confirmed", "Exclusive"],
    smsOpener: "Hi {firstName}, you install windows right? Got homeowners ready for replacement windows in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_hvac",
    name: "HVAC",
    category: "HOME_SERVICES",
    description: "AC installation, furnace repair, water heater replacement",
    avgJobValue: { min: 500, max: 12000 },
    titles: ["HVAC Contractor", "Owner", "Technician", "Service Manager"],
    painPoints: ["Emergency calls", "Seasonality", "Competition"],
    valueProps: ["Live transfers", "Immediate service needs", "Pre-qualified"],
    smsOpener: "Hi {firstName}, you do HVAC work right? Got homeowners needing AC/heating service in your area. Live transfers available. -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_plumbing",
    name: "Plumbing",
    category: "HOME_SERVICES",
    description: "Plumbing repairs, installations, emergencies",
    avgJobValue: { min: 200, max: 5000 },
    titles: ["Plumber", "Owner", "Service Manager", "Technician"],
    painPoints: ["Emergency response", "Lead volume", "Competition"],
    valueProps: ["Live transfers", "Pre-qualified emergencies", "Exclusive"],
    smsOpener: "Hi {firstName}, you run a plumbing company right? Got homeowners with plumbing needs in your area. Live transfers. -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_solar",
    name: "Solar Installation",
    category: "HOME_SERVICES",
    description: "Solar panels, renewable energy, full conversions",
    avgJobValue: { min: 20000, max: 40000 },
    titles: ["Solar Installer", "Owner", "Sales Rep", "Project Manager"],
    painPoints: ["Lead quality", "Roof suitability", "Financing"],
    valueProps: ["Pre-screened for roof", "Financing confirmed", "High intent"],
    smsOpener: "Hi {firstName}, you install solar right? Got homeowners exploring solar in your area, pre-screened for roof suitability. -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_bathroom",
    name: "Bathroom Remodeling",
    category: "HOME_SERVICES",
    description: "Bathroom upgrades, tubs, showers, full remodels",
    avgJobValue: { min: 8000, max: 25000 },
    titles: ["Bathroom Remodeler", "Owner", "Designer", "Contractor"],
    painPoints: ["Lead quality", "Design scope creep", "Competition"],
    valueProps: ["Pre-qualified leads", "Budget confirmed", "Timeline ready"],
    smsOpener: "Hi {firstName}, you do bathroom remodels right? Got homeowners planning bathroom projects in your area. Quick call? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_flooring",
    name: "Flooring Installation",
    category: "HOME_SERVICES",
    description: "Hardwood, tile, carpet, laminate installation",
    avgJobValue: { min: 3000, max: 15000 },
    titles: ["Flooring Installer", "Owner", "Estimator", "Sales Rep"],
    painPoints: ["Lead quality", "Material preferences", "Timing"],
    valueProps: ["Pre-qualified leads", "Material type confirmed", "Ready to buy"],
    smsOpener: "Hi {firstName}, you install flooring right? Got homeowners ready for new floors in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_pest",
    name: "Pest Control",
    category: "HOME_SERVICES",
    description: "Pest extermination, prevention, ongoing service",
    avgJobValue: { min: 150, max: 500 },
    titles: ["Pest Control Tech", "Owner", "Service Manager", "Sales Rep"],
    painPoints: ["Recurring revenue", "Seasonality", "Lead volume"],
    valueProps: ["Live transfers", "Recurring customers", "Pre-qualified"],
    smsOpener: "Hi {firstName}, you do pest control right? Got homeowners with pest issues in your area. Live transfers available. -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_landscaping",
    name: "Landscaping & Lawn Care",
    category: "HOME_SERVICES",
    description: "Lawn maintenance, landscaping, hardscaping",
    avgJobValue: { min: 200, max: 10000 },
    titles: ["Landscaper", "Owner", "Crew Lead", "Designer"],
    painPoints: ["Seasonality", "Recurring contracts", "Competition"],
    valueProps: ["Recurring customers", "Pre-qualified", "Ready to schedule"],
    smsOpener: "Hi {firstName}, you do landscaping right? Got homeowners looking for lawn service in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_painting",
    name: "Painting & Drywall",
    category: "HOME_SERVICES",
    description: "Interior/exterior painting, drywall repair",
    avgJobValue: { min: 500, max: 8000 },
    titles: ["Painter", "Owner", "Estimator", "Project Manager"],
    painPoints: ["Lead quality", "Scope changes", "Competition"],
    valueProps: ["Pre-qualified leads", "Scope confirmed", "Ready to hire"],
    smsOpener: "Hi {firstName}, you do painting work right? Got homeowners ready for paint jobs in your area. Quick call? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_deck",
    name: "Deck & Patio Builds",
    category: "HOME_SERVICES",
    description: "Deck construction, patio builds, outdoor living",
    avgJobValue: { min: 5000, max: 25000 },
    titles: ["Deck Builder", "Owner", "Designer", "Contractor"],
    painPoints: ["Seasonality", "Permits", "Material costs"],
    valueProps: ["Pre-qualified leads", "Budget confirmed", "Ready to start"],
    smsOpener: "Hi {firstName}, you build decks right? Got homeowners planning deck projects in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_garage",
    name: "Garage Door Installation",
    category: "HOME_SERVICES",
    description: "Garage door installation, repair, openers",
    avgJobValue: { min: 500, max: 3000 },
    titles: ["Garage Door Tech", "Owner", "Installer", "Service Manager"],
    painPoints: ["Emergency calls", "Lead volume", "Competition"],
    valueProps: ["Live transfers", "Emergency ready", "Pre-qualified"],
    smsOpener: "Hi {firstName}, you install garage doors right? Got homeowners needing garage door service in your area. -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_fence",
    name: "Fence Installation",
    category: "HOME_SERVICES",
    description: "Fence building, repair, gates",
    avgJobValue: { min: 2000, max: 10000 },
    titles: ["Fence Contractor", "Owner", "Estimator", "Installer"],
    painPoints: ["Lead quality", "Material preferences", "Permits"],
    valueProps: ["Pre-qualified leads", "Material type confirmed", "Ready to hire"],
    smsOpener: "Hi {firstName}, you install fences right? Got homeowners ready for fence projects in your area. Quick call? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
  {
    id: "home_handyman",
    name: "General Handyman",
    category: "HOME_SERVICES",
    description: "Repairs, maintenance, odd jobs",
    avgJobValue: { min: 150, max: 1000 },
    titles: ["Handyman", "Owner", "Technician", "Service Provider"],
    painPoints: ["Recurring work", "Lead volume", "Pricing"],
    valueProps: ["Recurring customers", "Pre-qualified", "Ready to schedule"],
    smsOpener: "Hi {firstName}, you do handyman work right? Got homeowners with repair needs in your area. Interested? -Emily",
    leadSources: ["tracerfy_ppl"],
    enrichmentProviders: ["tracerfy", "fastappend"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRUCKING & LOGISTICS INDUSTRIES
// ═══════════════════════════════════════════════════════════════════════════════

export const TRUCKING_INDUSTRIES: Industry[] = [
  {
    id: "trucking_fleet",
    name: "Fleet Owners",
    category: "TRUCKING",
    description: "Trucking fleet owners and operators",
    titles: ["Fleet Owner", "Owner Operator", "Trucking Company Owner", "Fleet Manager"],
    painPoints: ["Driver recruitment", "Load booking", "Cash flow"],
    valueProps: ["More loads", "Better rates", "Driver recruitment"],
    smsOpener: "Hi {firstName}, running a trucking fleet right? Got something that helps fleet owners book more loads at better rates. Quick call? -Emily",
    leadSources: ["usbizdata"],
    enrichmentProviders: ["fastappend", "usbizdata"],
  },
  {
    id: "trucking_owner_operator",
    name: "Owner Operators",
    category: "TRUCKING",
    description: "Independent truck owner operators",
    titles: ["Owner Operator", "Independent Trucker", "CDL Driver/Owner"],
    painPoints: ["Finding loads", "Fuel costs", "Paperwork"],
    valueProps: ["Better loads", "Less deadhead", "More profit"],
    smsOpener: "Hi {firstName}, you an owner operator? Got a way to help you book better loads and cut deadhead miles. Interested? -Emily",
    leadSources: ["usbizdata"],
    enrichmentProviders: ["fastappend", "usbizdata"],
  },
  {
    id: "trucking_logistics",
    name: "Logistics Companies",
    category: "TRUCKING",
    description: "3PL, freight brokers, logistics providers",
    titles: ["Logistics Manager", "Owner", "Freight Broker", "Operations Director"],
    painPoints: ["Carrier capacity", "Shipper acquisition", "Margins"],
    valueProps: ["More capacity", "Better margins", "Shipper leads"],
    smsOpener: "Hi {firstName}, running a logistics company right? Got a system that helps 3PLs find more capacity and shippers. Quick call? -Emily",
    leadSources: ["usbizdata", "apollo"],
    enrichmentProviders: ["apollo", "fastappend"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL INDUSTRIES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_INDUSTRIES: Industry[] = [
  ...B2B_INDUSTRIES,
  ...REAL_ESTATE_INDUSTRIES,
  ...HOME_SERVICES_INDUSTRIES,
  ...TRUCKING_INDUSTRIES,
];

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SOURCES
// ═══════════════════════════════════════════════════════════════════════════════

export const LEAD_SOURCES: LeadSource[] = [
  {
    id: "usbizdata",
    name: "USBizData",
    type: "csv_import",
    provider: "USBizData",
    costPerLead: 0.01,
    industries: ["b2b_tech", "b2b_marketing", "b2b_sales", "trucking_fleet", "trucking_logistics"],
  },
  {
    id: "apollo",
    name: "Apollo.io",
    type: "api",
    provider: "Apollo",
    costPerLead: 0.05,
    industries: ["b2b_tech", "b2b_marketing", "b2b_sales"],
  },
  {
    id: "tracerfy",
    name: "Tracerfy Skip Trace",
    type: "api",
    provider: "Tracerfy",
    costPerLead: 0.02,
    industries: ["re_agents", "re_investors", "re_property_managers"],
  },
  {
    id: "tracerfy_ppl",
    name: "Tracerfy Pay Per Lead",
    type: "api",
    provider: "Tracerfy",
    costPerLead: undefined, // Variable pricing
    industries: HOME_SERVICES_INDUSTRIES.map(i => i.id),
  },
  {
    id: "fastappend",
    name: "FastAppend",
    type: "api",
    provider: "Tracerfy/FastAppend",
    costPerLead: 0.02,
    industries: ALL_INDUSTRIES.map(i => i.id),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getIndustryById(id: string): Industry | undefined {
  return ALL_INDUSTRIES.find(i => i.id === id);
}

export function getIndustriesByCategory(category: Industry["category"]): Industry[] {
  return ALL_INDUSTRIES.filter(i => i.category === category);
}

export function getLeadSourcesForIndustry(industryId: string): LeadSource[] {
  return LEAD_SOURCES.filter(s => s.industries.includes(industryId));
}

export function getIndustryOpener(industryId: string, firstName: string): string {
  const industry = getIndustryById(industryId);
  if (!industry) return `Hi ${firstName}, quick question - do you have a few minutes to chat? -Emily`;
  return industry.smsOpener.replace("{firstName}", firstName);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY STATS
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRY_STATS = {
  totalIndustries: ALL_INDUSTRIES.length,
  b2bCount: B2B_INDUSTRIES.length,
  realEstateCount: REAL_ESTATE_INDUSTRIES.length,
  homeServicesCount: HOME_SERVICES_INDUSTRIES.length,
  truckingCount: TRUCKING_INDUSTRIES.length,
  leadSources: LEAD_SOURCES.length,
};

console.log(`[Industries] Loaded ${INDUSTRY_STATS.totalIndustries} industries across ${Object.keys(INDUSTRY_STATS).length - 2} categories`);
