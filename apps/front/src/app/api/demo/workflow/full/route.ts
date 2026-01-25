import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

// Demo lead generation data
const FIRST_NAMES = ["John", "Sarah", "Mike", "Emily", "David", "Lisa", "James", "Jennifer", "Robert", "Maria"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

const INDUSTRIES: Record<string, { companies: string[]; titles: string[] }> = {
  real_estate: {
    companies: ["Premier Realty", "HomeStar Properties", "Elite Real Estate", "Sunrise Homes", "Golden Gate Realty"],
    titles: ["Real Estate Agent", "Broker", "Property Manager", "Realtor", "Sales Associate"],
  },
  insurance: {
    companies: ["SafeGuard Insurance", "Premier Coverage", "Shield Insurance", "Trusted Life Insurance", "Family First Insurance"],
    titles: ["Insurance Agent", "Sales Representative", "Account Manager", "Insurance Broker", "Agency Owner"],
  },
  solar: {
    companies: ["SunPower Solutions", "Green Energy Co", "Solar First", "Bright Future Solar", "EcoSolar Systems"],
    titles: ["Sales Representative", "Energy Consultant", "Project Manager", "Sales Manager", "Account Executive"],
  },
};

const STATES: Record<string, { cities: string[]; areaCode: string }> = {
  FL: { cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"], areaCode: "305" },
  TX: { cities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"], areaCode: "713" },
  CA: { cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"], areaCode: "310" },
};

const TEMPLATES: Record<string, string> = {
  opener: "Hey {firstName}, this is Gianna from Nextier. I noticed you're in {industry} in {city} - we help businesses like yours get more qualified leads. Worth a quick chat?",
  followup: "Hi {firstName}! Just following up on my earlier message. I'd love to show you how we've helped other {industry} professionals in {state} grow their business. Free to talk this week?",
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(areaCode: string): string {
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${subscriber}`;
}

function fillTemplate(template: string, lead: Record<string, string>): string {
  return template
    .replace(/{firstName}/g, lead.firstName || "there")
    .replace(/{lastName}/g, lead.lastName || "")
    .replace(/{company}/g, lead.company || "your company")
    .replace(/{city}/g, lead.city || "your area")
    .replace(/{state}/g, lead.state || "")
    .replace(/{industry}/g, lead.industry || "your industry");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId,
      count = 10,
      industry = "real_estate",
      state = "FL",
      templateType = "opener",
      customTemplate,
      dryRun = true
    } = body;

    const industryData = INDUSTRIES[industry] || INDUSTRIES.real_estate;
    const stateData = STATES[state] || STATES.FL;
    const batchId = uuidv4();

    // Step 1: Generate leads
    const generatedLeads = Array.from({ length: Math.min(count, 100) }, () => {
      const firstName = randomChoice(FIRST_NAMES);
      const lastName = randomChoice(LAST_NAMES);
      const city = randomChoice(stateData.cities);

      return {
        id: uuidv4(),
        firstName,
        lastName,
        phone: generatePhone(stateData.areaCode),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        company: randomChoice(industryData.companies),
        title: randomChoice(industryData.titles),
        city,
        state,
        industry,
        address: `${Math.floor(Math.random() * 9000) + 1000} Main St`,
        zip: String(Math.floor(Math.random() * 90000) + 10000),
      };
    });

    // Step 2: Save leads to database (if not dry run)
    let savedCount = 0;
    if (!dryRun && teamId) {
      try {
        const leadsToInsert = generatedLeads.map((lead) => ({
          id: lead.id,
          teamId: teamId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: lead.email,
          company: lead.company,
          title: lead.title,
          city: lead.city,
          state: lead.state,
          address: lead.address,
          zipCode: lead.zip,
          source: "demo",
          status: "new",
          pipelineStatus: "ready",
          score: Math.floor(Math.random() * 30) + 70, // 70-100
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await db.insert(leads).values(leadsToInsert);
        savedCount = leadsToInsert.length;
      } catch (dbError) {
        console.error("[Demo Workflow] DB Error:", dbError);
        // Continue even if DB fails
      }
    }

    // Step 3: Queue SMS (if not dry run and SignalHouse configured)
    let smsSuccess = 0;
    let smsFailed = 0;
    const template = customTemplate || TEMPLATES[templateType] || TEMPLATES.opener;

    if (!dryRun) {
      const signalHouseKey = process.env.SIGNALHOUSE_API_KEY;
      const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER || process.env.SMS_FROM_NUMBER;

      if (signalHouseKey && fromNumber) {
        for (const lead of generatedLeads.slice(0, 50)) { // Limit to 50 for safety
          try {
            const message = fillTemplate(template, lead);

            const response = await fetch("https://api.signalhouse.io/api/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": signalHouseKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: lead.phone,
                from: fromNumber,
                body: message,
              }),
            });

            if (response.ok) {
              smsSuccess++;
            } else {
              smsFailed++;
            }
          } catch {
            smsFailed++;
          }
        }
      }
    }

    const estimatedCost = (dryRun ? generatedLeads.length : smsSuccess) * 1.2 * 0.0075;

    return NextResponse.json({
      success: true,
      dryRun,
      leads: {
        generated: generatedLeads.length,
        saved: savedCount,
        data: dryRun ? generatedLeads : undefined,
      },
      batch: {
        batchId,
        totalQueued: dryRun ? generatedLeads.length : smsSuccess + smsFailed,
        success: dryRun ? generatedLeads.length : smsSuccess,
        failed: dryRun ? 0 : smsFailed,
        estimatedCost,
      },
      message: dryRun
        ? `DRY RUN: Would generate ${generatedLeads.length} leads and queue ${generatedLeads.length} SMS`
        : `Generated ${savedCount} leads, sent ${smsSuccess} SMS (${smsFailed} failed)`,
    });

  } catch (error) {
    console.error("[Demo Workflow Full] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow failed" },
      { status: 500 }
    );
  }
}
