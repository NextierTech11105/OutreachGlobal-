// Data Enrichment Service
import type { PhoneNumber } from "@/types/lead";

// Skip Trace Providers
export type SkipTraceProvider =
  | "tlo"
  | "lexisnexis"
  | "melissa"
  | "idi"
  | "tracers"
  | "spokeo"
  | "beenverified"
  | "intelius";

// Data Append Providers
export type DataAppendProvider =
  | "attom"
  | "corelogic"
  | "blackknight"
  | "firstam"
  | "zillow"
  | "redfin";

export interface SkipTraceOptions {
  provider: SkipTraceProvider;
  fields: {
    name?: boolean;
    phone?: boolean;
    email?: boolean;
    address?: boolean;
    relatives?: boolean;
    associates?: boolean;
    bankruptcy?: boolean;
    liensJudgments?: boolean;
    criminalRecords?: boolean;
    propertyRecords?: boolean;
    businessRecords?: boolean;
  };
}

export interface DataAppendOptions {
  provider: DataAppendProvider;
  fields: {
    propertyCharacteristics?: boolean;
    ownerInfo?: boolean;
    taxAssessment?: boolean;
    mortgageInfo?: boolean;
    foreclosureStatus?: boolean;
    marketValue?: boolean;
    demographicData?: boolean;
    schoolInfo?: boolean;
    floodZone?: boolean;
    crimeData?: boolean;
    salesHistory?: boolean;
    permitHistory?: boolean;
  };
}

export interface SkipTraceInput {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export interface SkipTraceResult {
  name: {
    firstName: string;
    lastName: string;
    middleName?: string;
  };
  phones: PhoneNumber[];
  emails: {
    email: string;
    verified: boolean;
    source: string;
  }[];
  addresses: {
    address: string;
    city: string;
    state: string;
    zip: string;
    type: string;
    moveInDate?: string;
    moveOutDate?: string;
  }[];
  relatives?: {
    name: string;
    relationship: string;
    age?: number;
    phones?: PhoneNumber[];
  }[];
  associates?: {
    name: string;
    relationship: string;
    phones?: PhoneNumber[];
  }[];
  bankruptcy?: {
    filingDate: string;
    caseNumber: string;
    chapter: string;
    status: string;
    court: string;
  }[];
  liensJudgments?: {
    type: string;
    filingDate: string;
    amount: number;
    status: string;
    court: string;
  }[];
  criminalRecords?: {
    type: string;
    date: string;
    jurisdiction: string;
    disposition: string;
  }[];
  propertyRecords?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    apn: string;
    ownerName: string;
    purchaseDate: string;
    purchasePrice: number;
  }[];
  businessRecords?: {
    name: string;
    type: string;
    role: string;
    status: string;
    filingDate: string;
  }[];
  score: {
    overall: number;
    confidence: number;
    dataQuality: number;
  };
}

export interface DataAppendInput {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  apn?: string;
  ownerName?: string;
}

export interface DataAppendResult {
  propertyCharacteristics?: {
    propertyType: string;
    yearBuilt: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    lotSize: number;
    stories: number;
    pool: boolean;
    garage: boolean;
    garageSize?: number;
    foundation: string;
    roof: string;
    heating: string;
    cooling: string;
  };
  ownerInfo?: {
    name: string;
    type: string;
    mailingAddress: string;
    ownerOccupied: boolean;
    ownershipType: string;
    ownershipDate: string;
    previousOwner: string;
  };
  taxAssessment?: {
    taxYear: number;
    assessedValue: number;
    taxAmount: number;
    taxRate: number;
    exemptions: string[];
  };
  mortgageInfo?: {
    lender: string;
    loanType: string;
    loanAmount: number;
    loanDate: string;
    interestRate?: number;
    term?: number;
    maturityDate?: string;
    secondMortgage?: {
      lender: string;
      loanAmount: number;
      loanDate: string;
    };
  };
  foreclosureStatus?: {
    status: string;
    stage: string;
    filingDate?: string;
    auctionDate?: string;
    originalLoanAmount?: number;
    defaultAmount?: number;
  };
  marketValue?: {
    estimatedValue: number;
    confidenceScore: number;
    valueRange: {
      low: number;
      high: number;
    };
    lastUpdated: string;
    valueHistory: {
      date: string;
      value: number;
    }[];
  };
  demographicData?: {
    medianIncome: number;
    medianHomeValue: number;
    population: number;
    populationDensity: number;
    ageDistribution: {
      under18: number;
      age18to34: number;
      age35to54: number;
      age55plus: number;
    };
    educationLevel: {
      highSchool: number;
      bachelors: number;
      graduate: number;
    };
  };
  schoolInfo?: {
    elementary: {
      name: string;
      rating: number;
      distance: number;
    };
    middle: {
      name: string;
      rating: number;
      distance: number;
    };
    high: {
      name: string;
      rating: number;
      distance: number;
    };
  };
  floodZone?: {
    zone: string;
    riskLevel: string;
    insuranceRequired: boolean;
    baseFloodElevation?: number;
  };
  crimeData?: {
    crimeIndex: number;
    nationalAvg: number;
    violent: number;
    property: number;
  };
  salesHistory?: {
    transactions: {
      date: string;
      price: number;
      buyer: string;
      seller: string;
      documentType: string;
    }[];
  };
  permitHistory?: {
    permits: {
      date: string;
      type: string;
      description: string;
      value: number;
      status: string;
    }[];
  };
}

// Mock implementation of skip trace service
export async function performSkipTrace(
  inputs: SkipTraceInput[],
  options: SkipTraceOptions,
): Promise<SkipTraceResult[]> {
  console.log(
    `Performing skip trace on ${inputs.length} records using ${options.provider}`,
  );
  console.log(`Fields requested:`, options.fields);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return mock data
  return inputs.map((input) => ({
    name: {
      firstName: input.firstName || "John",
      lastName: input.lastName || "Doe",
      middleName: Math.random() > 0.5 ? "M" : undefined,
    },
    phones: [
      {
        number:
          input.phone ||
          `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        label: "Mobile",
        isPrimary: true,
        lineType: "mobile",
        carrier: "Verizon",
        verified: true,
        lastVerified: new Date().toISOString(),
      },
      {
        number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        label: "Home",
        isPrimary: false,
        lineType: "landline",
        carrier: "AT&T",
        verified: true,
        lastVerified: new Date().toISOString(),
      },
    ],
    emails: [
      {
        email:
          input.email ||
          `${input.firstName || "john"}.${input.lastName || "doe"}@example.com`.toLowerCase(),
        verified: true,
        source: "Public Records",
      },
      {
        email:
          `${input.firstName || "john"}${Math.floor(Math.random() * 1000)}@gmail.com`.toLowerCase(),
        verified: false,
        source: "Social Media",
      },
    ],
    addresses: [
      {
        address: input.address || "123 Main St",
        city: input.city || "New York",
        state: input.state || "NY",
        zip: input.zip || "10001",
        type: "Current",
        moveInDate: "2020-01-15",
      },
      {
        address: "456 Oak Ave",
        city: "Brooklyn",
        state: "NY",
        zip: "11201",
        type: "Previous",
        moveInDate: "2015-03-22",
        moveOutDate: "2019-12-31",
      },
    ],
    relatives: options.fields.relatives
      ? [
          {
            name: "Jane Doe",
            relationship: "Spouse",
            age: 42,
            phones: [
              {
                number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
                label: "Mobile",
                isPrimary: true,
                lineType: "mobile",
                carrier: "T-Mobile",
                verified: true,
                lastVerified: new Date().toISOString(),
              },
            ],
          },
          {
            name: "Michael Doe",
            relationship: "Son",
            age: 18,
          },
        ]
      : undefined,
    associates: options.fields.associates
      ? [
          {
            name: "Robert Smith",
            relationship: "Business Partner",
          },
          {
            name: "Sarah Johnson",
            relationship: "Neighbor",
          },
        ]
      : undefined,
    bankruptcy: options.fields.bankruptcy
      ? [
          {
            filingDate: "2018-05-12",
            caseNumber: "18-12345",
            chapter: "Chapter 7",
            status: "Discharged",
            court: "Southern District of New York",
          },
        ]
      : undefined,
    liensJudgments: options.fields.liensJudgments
      ? [
          {
            type: "Tax Lien",
            filingDate: "2019-03-15",
            amount: 5250,
            status: "Released",
            court: "New York County",
          },
          {
            type: "Civil Judgment",
            filingDate: "2020-11-03",
            amount: 12500,
            status: "Active",
            court: "Kings County",
          },
        ]
      : undefined,
    criminalRecords: options.fields.criminalRecords
      ? [
          {
            type: "Misdemeanor",
            date: "2017-08-22",
            jurisdiction: "New York County",
            disposition: "Guilty Plea",
          },
        ]
      : undefined,
    propertyRecords: options.fields.propertyRecords
      ? [
          {
            address: input.address || "123 Main St",
            city: input.city || "New York",
            state: input.state || "NY",
            zip: input.zip || "10001",
            apn: "123-456-789",
            ownerName: `${input.firstName || "John"} ${input.lastName || "Doe"}`,
            purchaseDate: "2020-01-15",
            purchasePrice: 450000,
          },
          {
            address: "789 Pine Blvd",
            city: "Queens",
            state: "NY",
            zip: "11355",
            apn: "789-012-345",
            ownerName: `${input.firstName || "John"} ${input.lastName || "Doe"}`,
            purchaseDate: "2022-06-30",
            purchasePrice: 325000,
          },
        ]
      : undefined,
    businessRecords: options.fields.businessRecords
      ? [
          {
            name: "Doe Enterprises LLC",
            type: "Limited Liability Company",
            role: "Managing Member",
            status: "Active",
            filingDate: "2019-04-18",
          },
        ]
      : undefined,
    score: {
      overall: 85 + Math.floor(Math.random() * 15),
      confidence: 90 + Math.floor(Math.random() * 10),
      dataQuality: 80 + Math.floor(Math.random() * 20),
    },
  }));
}

// Mock implementation of data append service
export async function performDataAppend(
  inputs: DataAppendInput[],
  options: DataAppendOptions,
): Promise<DataAppendResult[]> {
  console.log(
    `Performing data append on ${inputs.length} records using ${options.provider}`,
  );
  console.log(`Fields requested:`, options.fields);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return mock data
  return inputs.map((input) => ({
    propertyCharacteristics: options.fields.propertyCharacteristics
      ? {
          propertyType: "Single Family Residential",
          yearBuilt: 1985 + Math.floor(Math.random() * 35),
          bedrooms: 3 + Math.floor(Math.random() * 3),
          bathrooms: 2 + Math.floor(Math.random() * 2),
          squareFeet: 1500 + Math.floor(Math.random() * 1500),
          lotSize: 5000 + Math.floor(Math.random() * 5000),
          stories: 1 + Math.floor(Math.random() * 2),
          pool: Math.random() > 0.7,
          garage: Math.random() > 0.3,
          garageSize:
            Math.random() > 0.3 ? 1 + Math.floor(Math.random() * 2) : undefined,
          foundation: "Concrete Slab",
          roof: "Asphalt Shingle",
          heating: "Forced Air",
          cooling: "Central AC",
        }
      : undefined,
    ownerInfo: options.fields.ownerInfo
      ? {
          name: input.ownerName || "John Doe",
          type: Math.random() > 0.8 ? "LLC" : "Individual",
          mailingAddress:
            Math.random() > 0.7
              ? `${input.address}, ${input.city}, ${input.state} ${input.zip}`
              : "789 Corporate Plaza, Manhattan, NY 10001",
          ownerOccupied: Math.random() > 0.3,
          ownershipType: "Fee Simple",
          ownershipDate: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
          previousOwner: "Previous Owner LLC",
        }
      : undefined,
    taxAssessment: options.fields.taxAssessment
      ? {
          taxYear: 2024,
          assessedValue: 350000 + Math.floor(Math.random() * 300000),
          taxAmount: 5000 + Math.floor(Math.random() * 5000),
          taxRate: 1.2 + Math.random(),
          exemptions: Math.random() > 0.7 ? ["Homestead"] : [],
        }
      : undefined,
    mortgageInfo: options.fields.mortgageInfo
      ? {
          lender: [
            "Chase",
            "Wells Fargo",
            "Bank of America",
            "Quicken Loans",
            "Citi",
          ][Math.floor(Math.random() * 5)],
          loanType: ["Conventional", "FHA", "VA", "USDA", "Jumbo"][
            Math.floor(Math.random() * 5)
          ],
          loanAmount: 300000 + Math.floor(Math.random() * 400000),
          loanDate: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
          interestRate: 3 + Math.random() * 3,
          term: 30,
          maturityDate: `205${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
          secondMortgage:
            Math.random() > 0.8
              ? {
                  lender: [
                    "Chase",
                    "Wells Fargo",
                    "Bank of America",
                    "Quicken Loans",
                    "Citi",
                  ][Math.floor(Math.random() * 5)],
                  loanAmount: 50000 + Math.floor(Math.random() * 100000),
                  loanDate: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
                }
              : undefined,
        }
      : undefined,
    foreclosureStatus: options.fields.foreclosureStatus
      ? {
          status: Math.random() > 0.8 ? "Pre-Foreclosure" : "None",
          stage: Math.random() > 0.8 ? "Notice of Default" : "N/A",
          filingDate:
            Math.random() > 0.8
              ? `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`
              : undefined,
          auctionDate:
            Math.random() > 0.9
              ? `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`
              : undefined,
          originalLoanAmount:
            Math.random() > 0.8
              ? 300000 + Math.floor(Math.random() * 400000)
              : undefined,
          defaultAmount:
            Math.random() > 0.8
              ? 10000 + Math.floor(Math.random() * 50000)
              : undefined,
        }
      : undefined,
    marketValue: options.fields.marketValue
      ? {
          estimatedValue: 400000 + Math.floor(Math.random() * 500000),
          confidenceScore: 75 + Math.floor(Math.random() * 25),
          valueRange: {
            low: 380000 + Math.floor(Math.random() * 400000),
            high: 450000 + Math.floor(Math.random() * 500000),
          },
          lastUpdated: new Date().toISOString().split("T")[0],
          valueHistory: [
            {
              date: "2023-01-01",
              value: 380000 + Math.floor(Math.random() * 400000),
            },
            {
              date: "2022-01-01",
              value: 350000 + Math.floor(Math.random() * 350000),
            },
            {
              date: "2021-01-01",
              value: 320000 + Math.floor(Math.random() * 300000),
            },
          ],
        }
      : undefined,
    demographicData: options.fields.demographicData
      ? {
          medianIncome: 65000 + Math.floor(Math.random() * 50000),
          medianHomeValue: 400000 + Math.floor(Math.random() * 300000),
          population: 25000 + Math.floor(Math.random() * 25000),
          populationDensity: 5000 + Math.floor(Math.random() * 5000),
          ageDistribution: {
            under18: 20 + Math.floor(Math.random() * 10),
            age18to34: 25 + Math.floor(Math.random() * 10),
            age35to54: 30 + Math.floor(Math.random() * 10),
            age55plus: 25 + Math.floor(Math.random() * 10),
          },
          educationLevel: {
            highSchool: 90 + Math.floor(Math.random() * 10),
            bachelors: 40 + Math.floor(Math.random() * 30),
            graduate: 15 + Math.floor(Math.random() * 15),
          },
        }
      : undefined,
    schoolInfo: options.fields.schoolInfo
      ? {
          elementary: {
            name: "Washington Elementary",
            rating: 7 + Math.floor(Math.random() * 3),
            distance: 0.5 + Math.random(),
          },
          middle: {
            name: "Lincoln Middle School",
            rating: 6 + Math.floor(Math.random() * 4),
            distance: 1 + Math.random() * 2,
          },
          high: {
            name: "Roosevelt High School",
            rating: 7 + Math.floor(Math.random() * 3),
            distance: 1.5 + Math.random() * 3,
          },
        }
      : undefined,
    floodZone: options.fields.floodZone
      ? {
          zone: ["X", "A", "AE", "AO", "VE"][Math.floor(Math.random() * 5)],
          riskLevel: ["Minimal", "Moderate", "High"][
            Math.floor(Math.random() * 3)
          ],
          insuranceRequired: Math.random() > 0.7,
          baseFloodElevation:
            Math.random() > 0.7
              ? 10 + Math.floor(Math.random() * 10)
              : undefined,
        }
      : undefined,
    crimeData: options.fields.crimeData
      ? {
          crimeIndex: 50 + Math.floor(Math.random() * 100),
          nationalAvg: 100,
          violent: 40 + Math.floor(Math.random() * 120),
          property: 60 + Math.floor(Math.random() * 100),
        }
      : undefined,
    salesHistory: options.fields.salesHistory
      ? {
          transactions: [
            {
              date: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
              price: 400000 + Math.floor(Math.random() * 300000),
              buyer: input.ownerName || "John Doe",
              seller: "Previous Owner LLC",
              documentType: "Warranty Deed",
            },
            {
              date: `201${5 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
              price: 300000 + Math.floor(Math.random() * 200000),
              buyer: "Previous Owner LLC",
              seller: "Original Owner",
              documentType: "Warranty Deed",
            },
          ],
        }
      : undefined,
    permitHistory: options.fields.permitHistory
      ? {
          permits: [
            {
              date: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
              type: "Renovation",
              description: "Kitchen remodel",
              value: 15000 + Math.floor(Math.random() * 25000),
              status: "Completed",
            },
            {
              date: `202${Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
              type: "Addition",
              description: "Deck addition",
              value: 8000 + Math.floor(Math.random() * 12000),
              status: "Completed",
            },
          ],
        }
      : undefined,
  }));
}
