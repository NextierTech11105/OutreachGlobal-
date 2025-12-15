import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RealEstateService } from "../services/real-estate.service";

// Valid RealEstateAPI PropertyType enums
const VALID_PROPERTY_TYPES = ["SFR", "MFR", "LAND", "CONDO", "OTHER", "MOBILE"];

// Parameters NOT allowed by RealEstateAPI (filter these out)
const INVALID_PARAMS = [
  "ownership_years_min",
  "ownership_years_max",
  "years_owned_min",
  "years_owned_max",
  "zoning",
];

// Validate and sanitize property search body
function sanitizeSearchBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    // Skip invalid parameters
    if (INVALID_PARAMS.includes(key)) {
      continue;
    }

    // Validate property_type
    if (key === "property_type" && typeof value === "string") {
      if (VALID_PROPERTY_TYPES.includes(value.toUpperCase())) {
        sanitized[key] = value.toUpperCase();
      }
      // Skip invalid property types
      continue;
    }

    // Pass through valid parameters
    if (value !== undefined && value !== null && value !== "") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Separate controller for /property-search route
@Controller("property-search")
export class PropertySearchController {
  constructor(private readonly realEstateService: RealEstateService) {}

  @Get()
  async searchPropertiesGet(@Query() query: Record<string, string>) {
    try {
      // Convert query params to RealEstateAPI format
      const body: Record<string, unknown> = {};

      // Location
      if (query.zip) body.zip = query.zip;
      if (query.city) body.city = query.city;
      if (query.state) body.state = query.state;
      if (query.county) body.county = query.county;
      if (query.latitude) body.latitude = parseFloat(query.latitude);
      if (query.longitude) body.longitude = parseFloat(query.longitude);
      if (query.radius) body.radius = parseFloat(query.radius);

      // Property filters - validate property_type
      if (query.property_type) {
        const pt = query.property_type.toUpperCase();
        if (VALID_PROPERTY_TYPES.includes(pt)) {
          body.property_type = pt;
        }
      }
      if (query.beds_min) body.beds_min = parseInt(query.beds_min);
      if (query.beds_max) body.beds_max = parseInt(query.beds_max);
      if (query.baths_min) body.baths_min = parseInt(query.baths_min);
      if (query.baths_max) body.baths_max = parseInt(query.baths_max);
      if (query.year_built_min)
        body.year_built_min = parseInt(query.year_built_min);
      if (query.year_built_max)
        body.year_built_max = parseInt(query.year_built_max);
      if (query.sqft_min) body.sqft_min = parseInt(query.sqft_min);
      if (query.sqft_max) body.sqft_max = parseInt(query.sqft_max);

      // Value filters
      if (query.estimated_value_min)
        body.estimated_value_min = parseInt(query.estimated_value_min);
      if (query.estimated_value_max)
        body.estimated_value_max = parseInt(query.estimated_value_max);
      if (query.estimated_equity_min)
        body.estimated_equity_min = parseInt(query.estimated_equity_min);
      if (query.estimated_equity_max)
        body.estimated_equity_max = parseInt(query.estimated_equity_max);
      if (query.equity_percent_min)
        body.equity_percent_min = parseInt(query.equity_percent_min);

      // Boolean filters
      if (query.absentee_owner === "true") body.absentee_owner = true;
      if (query.owner_occupied === "true") body.owner_occupied = true;
      if (query.high_equity === "true") body.high_equity = true;
      if (query.pre_foreclosure === "true") body.pre_foreclosure = true;
      if (query.foreclosure === "true") body.foreclosure = true;
      if (query.vacant === "true") body.vacant = true;
      if (query.tax_lien === "true") body.tax_lien = true;
      if (query.inherited === "true") body.inherited = true;
      if (query.corporate_owned === "true") body.corporate_owned = true;
      if (query.free_and_clear === "true") body.free_clear = true;

      // MLS filters
      if (query.mls_active === "true") body.mls_active = true;
      if (query.mls_pending === "true") body.mls_pending = true;
      if (query.mls_sold === "true") body.mls_sold = true;

      // Pagination
      if (query.size) body.size = parseInt(query.size);
      if (query.from) body.from = parseInt(query.from);
      if (query.start) body.from = parseInt(query.start);

      // Response mode
      if (query.count === "true") body.count = true;
      if (query.ids_only === "true") body.ids_only = true;

      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        body,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Post()
  async searchPropertiesPost(@Body() body: any) {
    try {
      // Sanitize body to remove invalid parameters
      const sanitizedBody = sanitizeSearchBody(body);
      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        sanitizedBody,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }
}

@Controller("property")
export class PropertyController {
  constructor(private readonly realEstateService: RealEstateService) {}

  // ============ SKIP TRACE ============

  @Post("skiptrace")
  async skipTrace(@Body() body: any) {
    try {
      // RealEstateAPI SkipTrace endpoint is v1, not v2
      const response = await this.realEstateService.client.post(
        "https://api.realestateapi.com/v1/SkipTrace",
        body,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Post("skiptrace/batch")
  async skipTraceBatch(@Body() body: { properties: any[] }) {
    try {
      const results = await Promise.all(
        body.properties.map(async (prop) => {
          try {
            const response = await this.realEstateService.client.post(
              "https://api.realestateapi.com/v1/SkipTrace",
              prop,
            );
            return { success: true, data: response.data, input: prop };
          } catch (error: any) {
            return {
              success: false,
              error: error.response?.data?.message || error.message,
              input: prop,
            };
          }
        }),
      );
      return {
        results,
        total: results.length,
        successful: results.filter((r) => r.success).length,
      };
    } catch (error: any) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  // ============ PROPERTY SEARCH ============

  @Post("search")
  async searchProperties(@Body() body: any) {
    try {
      // Sanitize body to remove invalid parameters
      const sanitizedBody = sanitizeSearchBody(body);
      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        sanitizedBody,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Get("search")
  async searchPropertiesGet(@Query() query: any) {
    try {
      // Sanitize query to remove invalid parameters
      const sanitizedQuery = sanitizeSearchBody(query);
      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        sanitizedQuery,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Post("detail")
  async getPropertyDetail(@Body() body: { id: string }) {
    try {
      const response = await this.realEstateService.client.post(
        "/PropertyDetail",
        body,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Get("detail")
  async getPropertyDetailGet(@Query("id") id: string) {
    try {
      const response = await this.realEstateService.client.post(
        "/PropertyDetail",
        { id },
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  // ============ AUTOCOMPLETE ============

  // US Counties by state (fallback data)
  private static readonly COUNTY_DATA: Record<string, string[]> = {
    AL: [
      "Jefferson",
      "Mobile",
      "Madison",
      "Montgomery",
      "Shelby",
      "Baldwin",
      "Tuscaloosa",
      "Lee",
    ],
    AK: [
      "Anchorage",
      "Fairbanks North Star",
      "Matanuska-Susitna",
      "Kenai Peninsula",
    ],
    AZ: [
      "Maricopa",
      "Pima",
      "Pinal",
      "Yavapai",
      "Mohave",
      "Yuma",
      "Coconino",
      "Cochise",
    ],
    AR: [
      "Pulaski",
      "Benton",
      "Washington",
      "Sebastian",
      "Faulkner",
      "Saline",
      "Craighead",
    ],
    CA: [
      "Los Angeles",
      "San Diego",
      "Orange",
      "Riverside",
      "San Bernardino",
      "Santa Clara",
      "Alameda",
      "Sacramento",
      "Contra Costa",
      "Fresno",
      "Ventura",
      "San Francisco",
      "San Mateo",
      "Kern",
      "San Joaquin",
    ],
    CO: [
      "Denver",
      "El Paso",
      "Arapahoe",
      "Jefferson",
      "Adams",
      "Larimer",
      "Douglas",
      "Boulder",
      "Weld",
    ],
    CT: [
      "Fairfield",
      "Hartford",
      "New Haven",
      "New London",
      "Litchfield",
      "Middlesex",
      "Tolland",
      "Windham",
    ],
    DE: ["New Castle", "Sussex", "Kent"],
    FL: [
      "Miami-Dade",
      "Broward",
      "Palm Beach",
      "Hillsborough",
      "Orange",
      "Pinellas",
      "Duval",
      "Lee",
      "Polk",
      "Brevard",
      "Volusia",
      "Pasco",
      "Seminole",
      "Sarasota",
      "Manatee",
      "Collier",
    ],
    GA: [
      "Fulton",
      "Gwinnett",
      "Cobb",
      "DeKalb",
      "Chatham",
      "Clayton",
      "Cherokee",
      "Forsyth",
      "Henry",
      "Richmond",
    ],
    HI: ["Honolulu", "Hawaii", "Maui", "Kauai"],
    ID: ["Ada", "Canyon", "Kootenai", "Bonneville", "Bannock", "Twin Falls"],
    IL: [
      "Cook",
      "DuPage",
      "Lake",
      "Will",
      "Kane",
      "McHenry",
      "Winnebago",
      "Madison",
      "St. Clair",
    ],
    IN: [
      "Marion",
      "Lake",
      "Allen",
      "Hamilton",
      "St. Joseph",
      "Elkhart",
      "Tippecanoe",
      "Vanderburgh",
      "Porter",
    ],
    IA: [
      "Polk",
      "Linn",
      "Scott",
      "Johnson",
      "Black Hawk",
      "Woodbury",
      "Dubuque",
      "Story",
    ],
    KS: [
      "Johnson",
      "Sedgwick",
      "Shawnee",
      "Wyandotte",
      "Douglas",
      "Leavenworth",
    ],
    KY: [
      "Jefferson",
      "Fayette",
      "Kenton",
      "Boone",
      "Warren",
      "Hardin",
      "Daviess",
    ],
    LA: [
      "East Baton Rouge",
      "Jefferson",
      "Orleans",
      "St. Tammany",
      "Caddo",
      "Calcasieu",
      "Lafayette",
    ],
    ME: ["Cumberland", "York", "Penobscot", "Kennebec", "Androscoggin"],
    MD: [
      "Montgomery",
      "Prince Georges",
      "Baltimore",
      "Anne Arundel",
      "Howard",
      "Baltimore City",
      "Harford",
      "Frederick",
    ],
    MA: [
      "Middlesex",
      "Worcester",
      "Suffolk",
      "Essex",
      "Norfolk",
      "Bristol",
      "Plymouth",
      "Hampden",
    ],
    MI: [
      "Wayne",
      "Oakland",
      "Macomb",
      "Kent",
      "Genesee",
      "Washtenaw",
      "Ingham",
      "Ottawa",
      "Kalamazoo",
    ],
    MN: [
      "Hennepin",
      "Ramsey",
      "Dakota",
      "Anoka",
      "Washington",
      "St. Louis",
      "Olmsted",
      "Scott",
      "Wright",
    ],
    MS: ["Hinds", "Harrison", "DeSoto", "Rankin", "Jackson", "Madison", "Lee"],
    MO: [
      "St. Louis",
      "Jackson",
      "St. Charles",
      "St. Louis City",
      "Greene",
      "Clay",
      "Jefferson",
      "Boone",
    ],
    MT: [
      "Yellowstone",
      "Missoula",
      "Gallatin",
      "Flathead",
      "Cascade",
      "Lewis and Clark",
    ],
    NE: ["Douglas", "Lancaster", "Sarpy", "Hall", "Buffalo", "Scotts Bluff"],
    NV: ["Clark", "Washoe", "Carson City", "Elko", "Douglas", "Lyon"],
    NH: ["Hillsborough", "Rockingham", "Merrimack", "Strafford", "Grafton"],
    NJ: [
      "Bergen",
      "Middlesex",
      "Essex",
      "Hudson",
      "Monmouth",
      "Ocean",
      "Union",
      "Passaic",
      "Camden",
      "Morris",
      "Burlington",
    ],
    NM: [
      "Bernalillo",
      "Dona Ana",
      "Santa Fe",
      "Sandoval",
      "San Juan",
      "Valencia",
    ],
    NY: [
      "Kings",
      "Queens",
      "New York",
      "Suffolk",
      "Bronx",
      "Nassau",
      "Westchester",
      "Erie",
      "Monroe",
      "Richmond",
      "Onondaga",
      "Albany",
    ],
    NC: [
      "Mecklenburg",
      "Wake",
      "Guilford",
      "Forsyth",
      "Cumberland",
      "Durham",
      "Buncombe",
      "Gaston",
      "New Hanover",
      "Cabarrus",
      "Union",
    ],
    ND: ["Cass", "Burleigh", "Grand Forks", "Ward", "Williams", "Stark"],
    OH: [
      "Cuyahoga",
      "Franklin",
      "Hamilton",
      "Summit",
      "Montgomery",
      "Lucas",
      "Butler",
      "Stark",
      "Lorain",
      "Warren",
    ],
    OK: ["Oklahoma", "Tulsa", "Cleveland", "Canadian", "Comanche", "Rogers"],
    OR: [
      "Multnomah",
      "Washington",
      "Clackamas",
      "Lane",
      "Marion",
      "Jackson",
      "Deschutes",
    ],
    PA: [
      "Philadelphia",
      "Allegheny",
      "Montgomery",
      "Bucks",
      "Delaware",
      "Lancaster",
      "Chester",
      "York",
      "Berks",
      "Lehigh",
    ],
    RI: ["Providence", "Kent", "Washington", "Newport", "Bristol"],
    SC: [
      "Greenville",
      "Richland",
      "Charleston",
      "Horry",
      "Spartanburg",
      "Lexington",
      "York",
    ],
    SD: [
      "Minnehaha",
      "Pennington",
      "Lincoln",
      "Brown",
      "Brookings",
      "Codington",
    ],
    TN: [
      "Shelby",
      "Davidson",
      "Knox",
      "Hamilton",
      "Rutherford",
      "Williamson",
      "Sumner",
      "Montgomery",
    ],
    TX: [
      "Harris",
      "Dallas",
      "Tarrant",
      "Bexar",
      "Travis",
      "Collin",
      "Hidalgo",
      "El Paso",
      "Denton",
      "Fort Bend",
      "Montgomery",
      "Williamson",
      "Cameron",
    ],
    UT: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache"],
    VT: ["Chittenden", "Rutland", "Washington", "Windsor", "Windham"],
    VA: [
      "Fairfax",
      "Prince William",
      "Virginia Beach City",
      "Loudoun",
      "Chesterfield",
      "Henrico",
      "Arlington",
      "Norfolk City",
      "Richmond City",
    ],
    WA: [
      "King",
      "Pierce",
      "Snohomish",
      "Spokane",
      "Clark",
      "Thurston",
      "Kitsap",
      "Yakima",
      "Whatcom",
    ],
    WV: ["Kanawha", "Berkeley", "Cabell", "Monongalia", "Wood", "Raleigh"],
    WI: [
      "Milwaukee",
      "Dane",
      "Waukesha",
      "Brown",
      "Racine",
      "Outagamie",
      "Winnebago",
      "Kenosha",
    ],
    WY: ["Laramie", "Natrona", "Campbell", "Sweetwater", "Fremont", "Albany"],
  };

  @Post("autocomplete")
  async autocomplete(@Body() body: { state: string; type: string }) {
    const { state, type } = body;

    if (!state) {
      return { error: "State is required" };
    }

    if (type === "county") {
      // Try RealEstateAPI first
      try {
        const response = await this.realEstateService.client.post(
          "https://api.realestateapi.com/v1/Autocomplete",
          { search: "", state, type: "county" },
        );

        if (
          response.data?.data &&
          Array.isArray(response.data.data) &&
          response.data.data.length > 0
        ) {
          const counties = response.data.data
            .map(
              (item: { county?: string; name?: string }) =>
                item.county || item.name || item,
            )
            .filter(Boolean);
          return { counties };
        }
      } catch (error) {
        console.warn("[Autocomplete] API failed, using fallback");
      }

      // Fallback to static data
      const counties =
        PropertyController.COUNTY_DATA[state.toUpperCase()] || [];
      return { counties: counties.sort() };
    }

    return { error: "Invalid type" };
  }
}
