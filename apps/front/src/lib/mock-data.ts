import type { Lead, PhoneNumber } from "@/types/lead";
import type { Message } from "@/types/message";

// Generate mock phone numbers with line type information
function generateMockPhoneNumbers(leadId: string): PhoneNumber[] {
  const phoneTypes = [
    "mobile",
    "landline",
    "voip",
    "toll_free",
    "premium",
    "unknown",
  ] as const;
  const carriers = [
    "Verizon Wireless",
    "AT&T Mobility",
    "T-Mobile",
    "Sprint",
    "US Cellular",
    "Metro by T-Mobile",
  ];

  // Generate 1-4 phone numbers
  const numPhones = Math.floor(Math.random() * 4) + 1;

  return Array(numPhones)
    .fill(null)
    .map((_, i) => {
      const typeIndex = Math.floor(Math.random() * phoneTypes.length);
      const carrierIndex = Math.floor(Math.random() * carriers.length);

      return {
        number: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        label:
          i === 0 ? "Mobile" : i === 1 ? "Home" : i === 2 ? "Work" : "Other",
        isPrimary: i === 0,
        lineType: phoneTypes[typeIndex],
        carrier: carriers[carrierIndex],
        verified: true,
        lastVerified: new Date().toISOString(),
      };
    });
}

// Mock leads data
export const mockLeads: Lead[] = [
  {
    id: "lead-1",
    name: "John Smith",
    address: "123 Main St",
    city: "Bronx",
    state: "NY",
    zipCode: "10455",
    propertyValue: 450000,
    propertyType: "Single Family",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    yearBuilt: 1985,
    email: "john.smith@example.com",
    phone: "(212) 555-1234",
    phoneNumbers: [
      {
        number: "(212) 555-1234",
        label: "Mobile",
        isPrimary: true,
        lineType: "mobile",
        carrier: "Verizon Wireless",
        verified: true,
        lastVerified: "2023-11-15T14:30:00Z",
      },
      {
        number: "(212) 555-5678",
        label: "Home",
        isPrimary: false,
        lineType: "landline",
        carrier: "AT&T",
        verified: true,
        lastVerified: "2023-11-15T14:30:00Z",
      },
      {
        number: "(212) 555-9012",
        label: "Work",
        isPrimary: false,
        lineType: "voip",
        carrier: "Comcast Business",
        verified: true,
        lastVerified: "2023-11-15T14:30:00Z",
      },
    ],
    status: "Qualified",
    source: "Website",
    priority: "High",
    assignedTo: "Sarah Johnson",
    lastContactDate: "2023-11-10T14:30:00Z",
    nextFollowUp: "2023-11-20T10:00:00Z",
    notes:
      "John is interested in selling his property due to relocation. He's looking for a quick sale and is motivated by a job offer in another state. Property needs minor repairs but is in good condition overall.",
    tags: ["Motivated Seller", "Relocation", "Pre-Approved"],
    createdAt: "2023-10-15T09:23:00Z",
    updatedAt: "2023-11-10T14:30:00Z",
  },
  {
    id: "lead-2",
    name: "Maria Rodriguez",
    address: "456 Oak Ave",
    city: "Bronx",
    state: "NY",
    zipCode: "10458",
    propertyValue: 380000,
    propertyType: "Condo",
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1200,
    yearBuilt: 1995,
    email: "maria.r@example.com",
    phone: "(212) 555-2345",
    phoneNumbers: generateMockPhoneNumbers("lead-2"),
    status: "Contacted",
    source: "Referral",
    priority: "Medium",
    assignedTo: "Michael Chen",
    lastContactDate: "2023-11-12T11:15:00Z",
    notes:
      "Maria inherited this property from her parents and is looking to sell. She's not in a rush but wants a fair price.",
    tags: ["Inherited Property", "First-Time Seller"],
    createdAt: "2023-10-20T13:45:00Z",
    updatedAt: "2023-11-12T11:15:00Z",
  },
  // Add more mock leads as needed...
  {
    id: "lead-3",
    name: "Robert Johnson",
    address: "789 Pine St",
    city: "Bronx",
    state: "NY",
    zipCode: "10460",
    propertyValue: 520000,
    propertyType: "Multi-Family",
    bedrooms: 5,
    bathrooms: 3,
    squareFeet: 2500,
    yearBuilt: 1970,
    email: "robert.j@example.com",
    phone: "(212) 555-3456",
    phoneNumbers: generateMockPhoneNumbers("lead-3"),
    status: "Proposal",
    source: "Cold Call",
    priority: "High",
    assignedTo: "Sarah Johnson",
    lastContactDate: "2023-11-08T15:45:00Z",
    nextFollowUp: "2023-11-18T14:00:00Z",
    tags: ["Investor", "Cash Buyer", "Multi-Unit"],
    createdAt: "2023-10-05T10:30:00Z",
    updatedAt: "2023-11-08T15:45:00Z",
  },
  {
    id: "lead-4",
    name: "Jennifer Williams",
    address: "321 Elm St",
    city: "Bronx",
    state: "NY",
    zipCode: "10452",
    propertyValue: 410000,
    propertyType: "Single Family",
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 1950,
    yearBuilt: 1988,
    email: "jennifer.w@example.com",
    phone: "(212) 555-4567",
    phoneNumbers: generateMockPhoneNumbers("lead-4"),
    status: "New",
    source: "Website",
    priority: "Low",
    tags: ["First-Time Seller"],
    createdAt: "2023-11-01T09:15:00Z",
    updatedAt: "2023-11-01T09:15:00Z",
  },
  {
    id: "lead-5",
    name: "David Lee",
    address: "654 Maple Ave",
    city: "Bronx",
    state: "NY",
    zipCode: "10456",
    propertyValue: 495000,
    propertyType: "Townhouse",
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2100,
    yearBuilt: 1992,
    email: "david.lee@example.com",
    phone: "(212) 555-5678",
    phoneNumbers: generateMockPhoneNumbers("lead-5"),
    status: "Negotiation",
    source: "Referral",
    priority: "Urgent",
    assignedTo: "Michael Chen",
    lastContactDate: "2023-11-14T13:20:00Z",
    nextFollowUp: "2023-11-16T11:00:00Z",
    notes:
      "David is relocating for work and needs to sell quickly. He's received an offer from another buyer but is willing to consider our proposal if we can move fast.",
    tags: ["Motivated Seller", "Relocation", "Competitive Offer"],
    createdAt: "2023-10-10T14:50:00Z",
    updatedAt: "2023-11-14T13:20:00Z",
  },
];

// Mock messages data
export const mockMessages: Message[] = [
  // Email messages
  {
    id: "msg-1",
    type: "email",
    from: "John Smith",
    email: "john.smith@example.com",
    subject: "Question about property valuation",
    preview: "I was wondering if the valuation you provided includes...",
    content:
      "Hello,\n\nI was wondering if the valuation you provided includes the recent renovations I made to the kitchen and bathroom? They were completed just last month and I believe they should add significant value to the property.\n\nAlso, when would be a good time to schedule a call to discuss the selling process in more detail?\n\nThanks,\nJohn Smith",
    date: "2023-11-10T14:30:00Z",
    status: "read",
    leadId: "lead-1",
  },
  {
    id: "msg-2",
    type: "email",
    from: "Maria Rodriguez",
    email: "maria.r@example.com",
    subject: "Documentation needed for sale",
    preview: "Could you please let me know what documents I need to...",
    content:
      "Hi there,\n\nCould you please let me know what documents I need to prepare for the sale of my condo? This is my first time selling a property, so I'm not familiar with the process.\n\nI have the original purchase agreement and some renovation receipts. Is there anything else I should gather?\n\nBest regards,\nMaria Rodriguez",
    date: "2023-11-12T11:15:00Z",
    status: "unread",
    leadId: "lead-2",
  },
  // SMS messages
  {
    id: "msg-3",
    type: "sms",
    from: "Robert Johnson",
    phone: "(212) 555-3456",
    preview: "Can we reschedule tomorrow's viewing to 3pm instead?",
    content:
      "Can we reschedule tomorrow's viewing to 3pm instead? Something came up with my work schedule.",
    date: "2023-11-08T15:45:00Z",
    status: "read",
    leadId: "lead-3",
  },
  {
    id: "msg-4",
    type: "sms",
    from: "David Lee",
    phone: "(212) 555-5678",
    preview: "Just reviewed your offer. Can we discuss the closing timeline?",
    content:
      "Just reviewed your offer. Can we discuss the closing timeline? I need to move by the end of next month.",
    date: "2023-11-14T13:20:00Z",
    status: "unread",
    leadId: "lead-5",
  },
  // More messages...
  {
    id: "msg-5",
    type: "email",
    from: "Jennifer Williams",
    email: "jennifer.w@example.com",
    subject: "Property listing questions",
    preview:
      "I'm interested in listing my property but have a few questions about...",
    content:
      "Hello,\n\nI'm interested in listing my property but have a few questions about your process. What are your commission rates? How long do you think it would take to sell a property like mine in the current market?\n\nI'd appreciate any information you can provide.\n\nThanks,\nJennifer Williams",
    date: "2023-11-01T09:15:00Z",
    status: "read",
    leadId: "lead-4",
  },
  {
    id: "msg-6",
    type: "email",
    from: "John Smith",
    email: "john.smith@example.com",
    subject: "Re: Property valuation",
    preview:
      "Thanks for the clarification on the valuation. I'm available for a call on...",
    content:
      "Hello again,\n\nThanks for the clarification on the valuation. I'm available for a call on Thursday between 2-5pm or Friday morning before 11am. Let me know what works for you.\n\nRegards,\nJohn",
    date: "2023-11-11T09:45:00Z",
    status: "read",
    leadId: "lead-1",
  },
  {
    id: "msg-7",
    type: "sms",
    from: "Maria Rodriguez",
    phone: "(212) 555-2345",
    preview: "Got your email. Will gather those documents this weekend.",
    content:
      "Got your email. Will gather those documents this weekend. Thanks for the detailed list!",
    date: "2023-11-13T10:30:00Z",
    status: "unread",
    leadId: "lead-2",
  },
];
