import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";

// US Counties by state (fallback data)
const COUNTY_DATA: Record<string, string[]> = {
  AL: ["Jefferson", "Mobile", "Madison", "Montgomery", "Shelby", "Baldwin", "Tuscaloosa", "Lee"],
  AK: ["Anchorage", "Fairbanks North Star", "Matanuska-Susitna", "Kenai Peninsula"],
  AZ: ["Maricopa", "Pima", "Pinal", "Yavapai", "Mohave", "Yuma", "Coconino", "Cochise"],
  AR: ["Pulaski", "Benton", "Washington", "Sebastian", "Faulkner", "Saline", "Craighead"],
  CA: ["Los Angeles", "San Diego", "Orange", "Riverside", "San Bernardino", "Santa Clara", "Alameda", "Sacramento", "Contra Costa", "Fresno", "Ventura", "San Francisco", "San Mateo", "Kern", "San Joaquin"],
  CO: ["Denver", "El Paso", "Arapahoe", "Jefferson", "Adams", "Larimer", "Douglas", "Boulder", "Weld"],
  CT: ["Fairfield", "Hartford", "New Haven", "New London", "Litchfield", "Middlesex", "Tolland", "Windham"],
  DE: ["New Castle", "Sussex", "Kent"],
  FL: ["Miami-Dade", "Broward", "Palm Beach", "Hillsborough", "Orange", "Pinellas", "Duval", "Lee", "Polk", "Brevard", "Volusia", "Pasco", "Seminole", "Sarasota", "Manatee", "Collier"],
  GA: ["Fulton", "Gwinnett", "Cobb", "DeKalb", "Chatham", "Clayton", "Cherokee", "Forsyth", "Henry", "Richmond"],
  HI: ["Honolulu", "Hawaii", "Maui", "Kauai"],
  ID: ["Ada", "Canyon", "Kootenai", "Bonneville", "Bannock", "Twin Falls"],
  IL: ["Cook", "DuPage", "Lake", "Will", "Kane", "McHenry", "Winnebago", "Madison", "St. Clair"],
  IN: ["Marion", "Lake", "Allen", "Hamilton", "St. Joseph", "Elkhart", "Tippecanoe", "Vanderburgh", "Porter"],
  IA: ["Polk", "Linn", "Scott", "Johnson", "Black Hawk", "Woodbury", "Dubuque", "Story"],
  KS: ["Johnson", "Sedgwick", "Shawnee", "Wyandotte", "Douglas", "Leavenworth"],
  KY: ["Jefferson", "Fayette", "Kenton", "Boone", "Warren", "Hardin", "Daviess"],
  LA: ["East Baton Rouge", "Jefferson", "Orleans", "St. Tammany", "Caddo", "Calcasieu", "Lafayette"],
  ME: ["Cumberland", "York", "Penobscot", "Kennebec", "Androscoggin"],
  MD: ["Montgomery", "Prince Georges", "Baltimore", "Anne Arundel", "Howard", "Baltimore City", "Harford", "Frederick"],
  MA: ["Middlesex", "Worcester", "Suffolk", "Essex", "Norfolk", "Bristol", "Plymouth", "Hampden"],
  MI: ["Wayne", "Oakland", "Macomb", "Kent", "Genesee", "Washtenaw", "Ingham", "Ottawa", "Kalamazoo"],
  MN: ["Hennepin", "Ramsey", "Dakota", "Anoka", "Washington", "St. Louis", "Olmsted", "Scott", "Wright"],
  MS: ["Hinds", "Harrison", "DeSoto", "Rankin", "Jackson", "Madison", "Lee"],
  MO: ["St. Louis", "Jackson", "St. Charles", "St. Louis City", "Greene", "Clay", "Jefferson", "Boone"],
  MT: ["Yellowstone", "Missoula", "Gallatin", "Flathead", "Cascade", "Lewis and Clark"],
  NE: ["Douglas", "Lancaster", "Sarpy", "Hall", "Buffalo", "Scotts Bluff"],
  NV: ["Clark", "Washoe", "Carson City", "Elko", "Douglas", "Lyon"],
  NH: ["Hillsborough", "Rockingham", "Merrimack", "Strafford", "Grafton"],
  NJ: ["Bergen", "Middlesex", "Essex", "Hudson", "Monmouth", "Ocean", "Union", "Passaic", "Camden", "Morris", "Burlington"],
  NM: ["Bernalillo", "Dona Ana", "Santa Fe", "Sandoval", "San Juan", "Valencia"],
  NY: ["Kings", "Queens", "New York", "Suffolk", "Bronx", "Nassau", "Westchester", "Erie", "Monroe", "Richmond", "Onondaga", "Albany"],
  NC: ["Mecklenburg", "Wake", "Guilford", "Forsyth", "Cumberland", "Durham", "Buncombe", "Gaston", "New Hanover", "Cabarrus", "Union"],
  ND: ["Cass", "Burleigh", "Grand Forks", "Ward", "Williams", "Stark"],
  OH: ["Cuyahoga", "Franklin", "Hamilton", "Summit", "Montgomery", "Lucas", "Butler", "Stark", "Lorain", "Warren"],
  OK: ["Oklahoma", "Tulsa", "Cleveland", "Canadian", "Comanche", "Rogers"],
  OR: ["Multnomah", "Washington", "Clackamas", "Lane", "Marion", "Jackson", "Deschutes"],
  PA: ["Philadelphia", "Allegheny", "Montgomery", "Bucks", "Delaware", "Lancaster", "Chester", "York", "Berks", "Lehigh"],
  RI: ["Providence", "Kent", "Washington", "Newport", "Bristol"],
  SC: ["Greenville", "Richland", "Charleston", "Horry", "Spartanburg", "Lexington", "York"],
  SD: ["Minnehaha", "Pennington", "Lincoln", "Brown", "Brookings", "Codington"],
  TN: ["Shelby", "Davidson", "Knox", "Hamilton", "Rutherford", "Williamson", "Sumner", "Montgomery"],
  TX: ["Harris", "Dallas", "Tarrant", "Bexar", "Travis", "Collin", "Hidalgo", "El Paso", "Denton", "Fort Bend", "Montgomery", "Williamson", "Cameron"],
  UT: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache"],
  VT: ["Chittenden", "Rutland", "Washington", "Windsor", "Windham"],
  VA: ["Fairfax", "Prince William", "Virginia Beach City", "Loudoun", "Chesterfield", "Henrico", "Arlington", "Norfolk City", "Richmond City"],
  WA: ["King", "Pierce", "Snohomish", "Spokane", "Clark", "Thurston", "Kitsap", "Yakima", "Whatcom"],
  WV: ["Kanawha", "Berkeley", "Cabell", "Monongalia", "Wood", "Raleigh"],
  WI: ["Milwaukee", "Dane", "Waukesha", "Brown", "Racine", "Outagamie", "Winnebago", "Kenosha"],
  WY: ["Laramie", "Natrona", "Campbell", "Sweetwater", "Fremont", "Albany"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, type } = body;

    if (!state) {
      return NextResponse.json({ error: "State is required" }, { status: 400 });
    }

    if (type === "county") {
      // Try RealEstateAPI first if key available
      if (REALESTATE_API_KEY) {
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
