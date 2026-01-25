import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Demo lead generation - creates fake leads for testing
const FIRST_NAMES = ["John", "Sarah", "Mike", "Emily", "David", "Lisa", "James", "Jennifer", "Robert", "Maria", "William", "Patricia", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Susan", "Charles", "Jessica"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"];

const INDUSTRIES: Record<string, { companies: string[]; titles: string[] }> = {
  real_estate: {
    companies: ["Premier Realty", "HomeStar Properties", "Elite Real Estate", "Sunrise Homes", "Golden Gate Realty", "Coastal Properties", "Metro Homes", "Sunset Realty", "First Choice Properties", "Dream Home Realtors"],
    titles: ["Real Estate Agent", "Broker", "Property Manager", "Realtor", "Sales Associate"],
  },
  insurance: {
    companies: ["SafeGuard Insurance", "Premier Coverage", "Shield Insurance", "Trusted Life Insurance", "Family First Insurance", "Secure Future Agency", "AllState Partners", "Liberty Insurance Group", "Guardian Insurance", "United Coverage"],
    titles: ["Insurance Agent", "Sales Representative", "Account Manager", "Insurance Broker", "Agency Owner"],
  },
  solar: {
    companies: ["SunPower Solutions", "Green Energy Co", "Solar First", "Bright Future Solar", "EcoSolar Systems", "Renewable Energy Pros", "SolarMax", "Clean Power Co", "Sunshine Energy", "SolarTech Solutions"],
    titles: ["Sales Representative", "Energy Consultant", "Project Manager", "Sales Manager", "Account Executive"],
  },
  roofing: {
    companies: ["Top Roof Pros", "Quality Roofing", "Apex Roofing Co", "Storm Shield Roofing", "All Weather Roofing", "Premier Roof Solutions", "Reliable Roofers", "Elite Roofing Services", "Master Roof Co", "First Rate Roofing"],
    titles: ["Sales Representative", "Project Estimator", "Sales Manager", "Owner", "Account Executive"],
  },
  hvac: {
    companies: ["Cool Comfort HVAC", "Climate Control Pros", "Air Quality Experts", "Total Comfort Systems", "Premier Heating & Cooling", "All Seasons HVAC", "Fresh Air Solutions", "Comfort Zone HVAC", "Quality Air Systems", "Perfect Temp Co"],
    titles: ["Sales Representative", "Service Manager", "Technician", "Sales Manager", "Owner"],
  },
};

const STATES: Record<string, { cities: string[]; areaCode: string }> = {
  FL: { cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "West Palm Beach", "Naples", "Sarasota", "Tallahassee", "Gainesville"], areaCode: "305" },
  TX: { cities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso", "Arlington", "Plano", "Irving", "Frisco"], areaCode: "713" },
  CA: { cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Fresno", "Oakland", "Long Beach", "Bakersfield", "Anaheim"], areaCode: "310" },
  NY: { cities: ["New York", "Buffalo", "Rochester", "Albany", "Syracuse", "Yonkers", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"], areaCode: "212" },
  AZ: { cities: ["Phoenix", "Tucson", "Mesa", "Scottsdale", "Chandler", "Gilbert", "Glendale", "Tempe", "Peoria", "Surprise"], areaCode: "480" },
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(areaCode: string): string {
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${subscriber}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 10, industry = "real_estate", state = "FL" } = body;

    const industryData = INDUSTRIES[industry] || INDUSTRIES.real_estate;
    const stateData = STATES[state] || STATES.FL;

    const leads = Array.from({ length: Math.min(count, 2000) }, () => {
      const firstName = randomChoice(FIRST_NAMES);
      const lastName = randomChoice(LAST_NAMES);
      const city = randomChoice(stateData.cities);

      return {
        id: uuidv4(),
        firstName,
        lastName,
        phone: generatePhone(stateData.areaCode),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomChoice(industryData.companies).toLowerCase().replace(/\s+/g, "")}.com`,
        company: randomChoice(industryData.companies),
        title: randomChoice(industryData.titles),
        city,
        state,
        address: `${Math.floor(Math.random() * 9000) + 1000} ${randomChoice(["Main", "Oak", "Maple", "Pine", "Cedar", "Elm", "Park", "Lake", "River", "Hill"])} ${randomChoice(["St", "Ave", "Blvd", "Dr", "Ln", "Way", "Rd", "Ct"])}`,
        zip: String(Math.floor(Math.random() * 90000) + 10000),
      };
    });

    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
      industry,
      state,
    });
  } catch (error) {
    console.error("[Demo Leads Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate leads" },
      { status: 500 }
    );
  }
}
