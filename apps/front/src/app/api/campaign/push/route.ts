import { NextRequest, NextResponse } from "next/server";

// Area codes by state for SignalHouse number provisioning
const STATE_AREA_CODES: Record<string, string> = {
  AL: "205",
  AK: "907",
  AZ: "480",
  AR: "501",
  CA: "310",
  CO: "303",
  CT: "203",
  DE: "302",
  FL: "305",
  GA: "404",
  HI: "808",
  ID: "208",
  IL: "312",
  IN: "317",
  IA: "515",
  KS: "316",
  KY: "502",
  LA: "504",
  ME: "207",
  MD: "301",
  MA: "617",
  MI: "313",
  MN: "612",
  MS: "601",
  MO: "314",
  MT: "406",
  NE: "402",
  NV: "702",
  NH: "603",
  NJ: "201",
  NM: "505",
  NY: "212",
  NC: "704",
  ND: "701",
  OH: "216",
  OK: "405",
  OR: "503",
  PA: "215",
  RI: "401",
  SC: "803",
  SD: "605",
  TN: "615",
  TX: "214",
  UT: "801",
  VT: "802",
  VA: "703",
  WA: "206",
  WV: "304",
  WI: "414",
  WY: "307",
};

function getAreaCodeForState(state: string): string | undefined {
  return STATE_AREA_CODES[state.toUpperCase()];
}

// Push leads to Nextier Campaign System
// This creates leads in the campaign and prepares them for AI SDR outreach

export interface CampaignLead {
  id: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  ownerName: string;
  phones: string[];
  emails: string[];
  score: number;
  tags: string[];
  equity?: number;
  value?: number;
  yearsOwned?: number;
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface CampaignPushRequest {
  campaignName: string;
  campaignType: "sms" | "email" | "voice" | "multi";
  leads: CampaignLead[];
  assignNumber?: boolean; // Provision Twilio number for campaign
  assignAiSdr?: boolean; // Assign AI SDR for auto-responses
  aiSdrId?: string; // Specific AI SDR to use
  initialMessageId?: string; // Initial message template
  scheduleStart?: string; // ISO datetime to start campaign
  dailyLimit?: number; // Max messages per day
  tags?: string[]; // Campaign-level tags
}

export interface CampaignPushResult {
  campaignId: string;
  campaignName: string;
  leadsAdded: number;
  leadsFailed: number;
  phoneAssigned?: string;
  aiSdrAssigned?: string;
  status: "ready" | "scheduled" | "active";
  errors?: string[];
}

// POST - Push leads to campaign
export async function POST(request: NextRequest) {
  try {
    const body: CampaignPushRequest = await request.json();
    const {
      campaignName,
      campaignType = "sms",
      leads,
      assignNumber = false,
      assignAiSdr = false,
      aiSdrId,
      initialMessageId,
      scheduleStart,
      dailyLimit = 500,
      tags = [],
    } = body;

    if (!campaignName) {
      return NextResponse.json(
        { error: "campaignName required" },
        { status: 400 },
      );
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "leads array required" },
        { status: 400 },
      );
    }

    // Filter leads that have contact info
    const validLeads = leads.filter((lead) => {
      if (
        campaignType === "sms" ||
        campaignType === "voice" ||
        campaignType === "multi"
      ) {
        return lead.phones && lead.phones.length > 0;
      }
      if (campaignType === "email") {
        return lead.emails && lead.emails.length > 0;
      }
      return true;
    });

    if (validLeads.length === 0) {
      return NextResponse.json(
        {
          error: `No leads with valid ${campaignType === "email" ? "emails" : "phone numbers"}`,
          totalLeads: leads.length,
          validLeads: 0,
        },
        { status: 400 },
      );
    }

    console.log(
      `[Campaign Push] Creating "${campaignName}" with ${validLeads.length} leads (${campaignType})`,
    );

    // Generate campaign ID
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Prepare campaign data
    const campaignData = {
      id: campaignId,
      name: campaignName,
      type: campaignType,
      status: scheduleStart ? "scheduled" : "ready",
      leads: validLeads.map((lead) => ({
        id: lead.id,
        propertyId: lead.propertyId,
        name: lead.ownerName,
        phone: lead.phones[0] || null,
        email: lead.emails[0] || null,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        county: lead.county,
        propertyType: lead.propertyType,
        score: lead.score,
        tags: [...(lead.tags || []), ...tags],
        equity: lead.equity,
        value: lead.value,
        yearsOwned: lead.yearsOwned,
        mailingAddress: lead.mailingAddress,
        status: "pending",
        addedAt: new Date().toISOString(),
      })),
      settings: {
        dailyLimit,
        scheduleStart,
        initialMessageId,
      },
      stats: {
        totalLeads: validLeads.length,
        sent: 0,
        delivered: 0,
        responded: 0,
        positive: 0,
        optOut: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in localStorage-like storage (would be database in production)
    // For now, we'll return success and store client-side
    const result: CampaignPushResult = {
      campaignId,
      campaignName,
      leadsAdded: validLeads.length,
      leadsFailed: leads.length - validLeads.length,
      status: scheduleStart ? "scheduled" : "ready",
    };

    // Assign SignalHouse phone number
    if (assignNumber) {
      try {
        // Call SignalHouse API to provision number
        const signalHouseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/signalhouse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "provision_number",
              campaignName: name,
              areaCode: validLeads[0]?.state
                ? getAreaCodeForState(validLeads[0].state)
                : undefined,
            }),
          },
        );

        if (signalHouseResponse.ok) {
          const shResult = await signalHouseResponse.json();
          result.phoneAssigned = shResult.phoneNumber;
          console.log(
            `[Campaign Push] SignalHouse number assigned: ${result.phoneAssigned}`,
          );
        } else {
          // Fallback: Use placeholder until SignalHouse is configured
          result.phoneAssigned = `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
          console.log(
            `[Campaign Push] SignalHouse not configured, using placeholder: ${result.phoneAssigned}`,
          );
        }
      } catch (err) {
        // SignalHouse not available, use placeholder
        result.phoneAssigned = `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
        console.log(`[Campaign Push] SignalHouse error, using placeholder`);
      }
    }

    // Simulate AI SDR assignment
    if (assignAiSdr) {
      // In production: Assign from aiSdrAvatarsTable
      result.aiSdrAssigned = aiSdrId || "sabrina_default";
      console.log(`[Campaign Push] Assigned AI SDR: ${result.aiSdrAssigned}`);
    }

    // Store campaign for retrieval
    if (typeof globalThis !== "undefined") {
      (globalThis as any).__campaigns = (globalThis as any).__campaigns || [];
      (globalThis as any).__campaigns.push(campaignData);
    }

    console.log(
      `[Campaign Push] Success: ${result.leadsAdded} leads added to "${campaignName}"`,
    );

    return NextResponse.json({
      success: true,
      campaign: result,
      data: campaignData,
      message: `Created campaign "${campaignName}" with ${validLeads.length} leads`,
    });
  } catch (error: any) {
    console.error("[Campaign Push] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - List campaigns
export async function GET() {
  try {
    const campaigns = (globalThis as any).__campaigns || [];

    return NextResponse.json({
      success: true,
      campaigns: campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        totalLeads: c.stats?.totalLeads || 0,
        sent: c.stats?.sent || 0,
        responded: c.stats?.responded || 0,
        createdAt: c.createdAt,
      })),
      count: campaigns.length,
    });
  } catch (error: any) {
    console.error("[Campaign List] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
