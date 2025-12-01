import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";

// US Counties by state (fallback data)
const COUNTY_DATA: Record<string, string[]> = {
  AL: ["Jefferson", "Mobile", "Madison", "Montgomery", "Shelby", "Baldwin", "Tuscaloosa", "Lee"],
  AZ: ["Maricopa", "Pima", "Pinal", "Yavapai", "Mohave", "Yuma", "Coconino", "Cochise"],
  CA: ["Los Angeles", "San Diego", "Orange", "Riverside", "San Bernardino", "Santa Clara", "Alameda", "Sacramento", "Contra Costa", "Fresno", "Ventura", "San Francisco"],
  CO: ["Denver", "El Paso", "Arapahoe", "Jefferson", "Adams", "Larimer", "Douglas", "Boulder", "Weld"],
  CT: ["Fairfield", "Hartford", "New Haven", "New London", "Litchfield", "Middlesex"],
  FL: ["Miami-Dade", "Broward", "Palm Beach", "Hillsborough", "Orange", "Pinellas", "Duval", "Lee", "Polk", "Brevard", "Volusia", "Pasco", "Seminole", "Sarasota"],
  GA: ["Fulton", "Gwinnett", "Cobb", "DeKalb", "Chatham", "Clayton", "Cherokee", "Forsyth", "Henry"],
  IL: ["Cook", "DuPage", "Lake", "Will", "Kane", "McHenry", "Winnebago", "Madison"],
  IN: ["Marion", "Lake", "Allen", "Hamilton", "St. Joseph", "Elkhart", "Tippecanoe", "Vanderburgh"],
  MA: ["Middlesex", "Worcester", "Suffolk", "Essex", "Norfolk", "Bristol", "Plymouth", "Hampden"],
  MD: ["Montgomery", "Prince Georges", "Baltimore", "Anne Arundel", "Howard", "Baltimore City", "Harford", "Frederick"],
  MI: ["Wayne", "Oakland", "Macomb", "Kent", "Genesee", "Washtenaw", "Ingham", "Ottawa"],
  MN: ["Hennepin", "Ramsey", "Dakota", "Anoka", "Washington", "St. Louis", "Olmsted", "Scott"],
  NC: ["Mecklenburg", "Wake", "Guilford", "Forsyth", "Cumberland", "Durham", "Buncombe", "Gaston", "New Hanover", "Cabarrus"],
  NJ: ["Bergen", "Middlesex", "Essex", "Hudson", "Monmouth", "Ocean", "Union", "Passaic", "Camden", "Morris"],
  NY: ["Kings", "Queens", "New York", "Suffolk", "Bronx", "Nassau", "Westchester", "Erie", "Monroe", "Richmond"],
  OH: ["Cuyahoga", "Franklin", "Hamilton", "Summit", "Montgomery", "Lucas", "Butler", "Stark", "Lorain"],
  PA: ["Philadelphia", "Allegheny", "Montgomery", "Bucks", "Delaware", "Lancaster", "Chester", "York", "Berks"],
  TX: ["Harris", "Dallas", "Tarrant", "Bexar", "Travis", "Collin", "Hidalgo", "El Paso", "Denton", "Fort Bend", "Montgomery"],
  VA: ["Fairfax", "Prince William", "Virginia Beach City", "Loudoun", "Chesterfield", "Henrico", "Arlington"],
  WA: ["King", "Pierce", "Snohomish", "Spokane", "Clark", "Thurston", "Kitsap", "Yakima"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, type } = body;

    if (\!state) {
      return NextResponse.json({ error: "State is required" }, { status: 400 });
    }

    if (type === "county") {
      // Try RealEstateAPI first
      try {
        const response = await fetch("https://api.realestateapi.com/v1/Autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": REALESTATE_API_KEY,
          },
          body: JSON.stringify({ search: "", state, type: "county" }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const counties = data.data
              .map((item: { county?: string; name?: string }) => item.county || item.name || item)
              .filter(Boolean);
            return NextResponse.json({ counties });
          }
        }
      } catch (apiError) {
        console.warn("[Autocomplete] API failed, using fallback:", apiError);
      }

      // Fallback to static data
      const counties = COUNTY_DATA[state.toUpperCase()] || [];
      return NextResponse.json({ counties: counties.sort() });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("[Autocomplete] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
