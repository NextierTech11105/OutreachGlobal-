/**
 * LUCI Campaign Generator
 *
 * Generates campaigns with unique IDs:
 * - Up to 2,000 per campaign type
 * - Each lead has unique ID
 * - Each campaign has unique ID
 * - Each message template has unique ID
 *
 * Campaign Types:
 * - CALL: 2K calls scheduled on calendar
 * - SMS_INITIAL: 2K initial SMS outreach
 * - SMS_RETARGET_NC: 2K retarget (No Contact)
 * - SMS_NURTURE: Follow-up nurture
 * - EMAIL_INITIAL: Initial email outreach
 * - EMAIL_FOLLOWUP: Follow-up emails
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, leads } from "@/lib/db/schema";
import { eq, and, sql, desc, asc, isNull, ne } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";

// Constants
const MAX_PER_CAMPAIGN = 2000; // 2K max per campaign type
const BATCH_SIZE = 100;

// Campaign types
type CampaignType =
  | "CALL"
  | "SMS_INITIAL"
  | "SMS_RETARGET_NC"
  | "SMS_NURTURE"
  | "SMS_NUDGE"
  | "EMAIL_INITIAL"
  | "EMAIL_FOLLOWUP";

interface CampaignTarget {
  // Unique IDs
  targetId: string; // Unique ID for this target in this campaign
  leadId: string; // Business/Lead ID from database
  campaignId: string; // Campaign unique ID
  messageTemplateId: string; // Message template unique ID

  // Contact info
  ownerName: string;
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  phone?: string;
  phoneType?: "mobile" | "landline" | "unknown";
  email?: string;
  address?: string;
  city?: string;
  state?: string;

  // Business context
  sicCode?: string;
  sicDescription?: string;
  employeeCount?: number;
  annualRevenue?: number;

  // Tags & Priority
  tags: string[];
  priority: "high" | "medium" | "low";

  // Campaign assignment
  campaignType: CampaignType;
  scheduledFor?: string; // ISO date for when to execute
  sequence: number; // Order in campaign (1, 2, 3...)
}

interface Campaign {
  // Unique identifiers
  campaignId: string;
  campaignType: CampaignType;
  messageTemplateId: string;

  // Metadata
  name: string;
  description: string;
  createdAt: string;
  scheduledStartDate?: string;

  // Stats
  targetCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;

  // Targets
  targets: CampaignTarget[];
}

// Generate unique IDs
function generateCampaignId(type: CampaignType): string {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${type}-${date}-${rand}`;
}

function generateTargetId(campaignId: string, sequence: number): string {
  return `${campaignId}-T${sequence.toString().padStart(5, "0")}`;
}

function generateMessageTemplateId(type: CampaignType): string {
  const templates: Record<CampaignType, string> = {
    CALL: "CALL-SCRIPT-001",
    SMS_INITIAL: "SMS-INIT-001",
    SMS_RETARGET_NC: "SMS-NC-RETARGET-001",
    SMS_NURTURE: "SMS-NURTURE-001",
    SMS_NUDGE: "SMS-NUDGE-001",
    EMAIL_INITIAL: "EMAIL-INIT-001",
    EMAIL_FOLLOWUP: "EMAIL-FOLLOWUP-001",
  };
  return `${templates[type]}-${Date.now()}`;
}

// Auto-tagging logic
const BLUE_COLLAR_SIC = [
  "15",
  "16",
  "17",
  "07",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "42",
  "49",
  "75",
  "76",
];
const TECH_INTEGRATION_SIC = [
  "50",
  "51",
  "60",
  "61",
  "63",
  "64",
  "73",
  "80",
  "82",
  "87",
];

function generateTags(biz: {
  sicCode: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  yearsInBusiness: number | null;
  yearEstablished: number | null;
  ownerName: string | null;
}): { tags: string[]; priority: "high" | "medium" | "low" } {
  const tags: string[] = [];
  let score = 0;
  const sicPrefix = biz.sicCode?.substring(0, 2) || "";

  if (BLUE_COLLAR_SIC.includes(sicPrefix)) {
    tags.push("blue-collar");
    score += 1;
    if (
      biz.employeeCount &&
      biz.employeeCount >= 5 &&
      biz.employeeCount <= 50
    ) {
      tags.push("acquisition-target");
      score += 2;
    }
    if (
      biz.annualRevenue &&
      biz.annualRevenue >= 500000 &&
      biz.annualRevenue <= 10000000
    ) {
      tags.push("sweet-spot-revenue");
      score += 2;
    }
  }

  if (TECH_INTEGRATION_SIC.includes(sicPrefix)) {
    tags.push("tech-integration");
    score += 1;
  }

  if (biz.yearEstablished) {
    const age = new Date().getFullYear() - biz.yearEstablished;
    if (age >= 20) {
      tags.push("mature-ownership");
      tags.push("potential-exit");
      score += 2;
    }
  }

  if (biz.ownerName) tags.push("owner-identified");

  let priority: "high" | "medium" | "low" = "low";
  if (score >= 5) priority = "high";
  else if (score >= 3) priority = "medium";

  return { tags, priority };
}

// ============================================================
// API ENDPOINT
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      action,
      // Campaign generation options
      campaignTypes = [
        "CALL",
        "SMS_INITIAL",
        "SMS_RETARGET_NC",
      ] as CampaignType[],
      maxPerCampaign = MAX_PER_CAMPAIGN,
      tagFilter, // Only include targets with these tags
      priorityFilter, // Only include these priorities
      scheduledStartDate, // When to start the campaign
      shuffle = true, // Randomize order
    } = body;

    // ============================================================
    // ACTION: GENERATE - Generate campaigns for each type
    // ============================================================
    if (action === "generate") {
      // Fetch businesses with owner info
      let query = db
        .select({
          id: businesses.id,
          companyName: businesses.companyName,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          ownerName: businesses.ownerName,
          ownerPhone: businesses.ownerPhone,
          ownerEmail: businesses.ownerEmail,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
          sicCode: businesses.sicCode,
          sicDescription: businesses.sicDescription,
          employeeCount: businesses.employeeCount,
          annualRevenue: businesses.annualRevenue,
          yearEstablished: businesses.yearEstablished,
          yearsInBusiness: businesses.yearsInBusiness,
        })
        .from(businesses)
        .where(eq(businesses.userId, userId));

      if (shuffle) {
        query = query.orderBy(sql`RANDOM()`);
      } else {
        query = query.orderBy(desc(businesses.annualRevenue)); // High value first
      }

      // Get more than needed for filtering
      const allBusinesses = await query.limit(
        maxPerCampaign * campaignTypes.length * 2,
      );

      // Tag and filter all businesses
      const taggedBusinesses = allBusinesses.map((biz) => {
        const { tags, priority } = generateTags({
          sicCode: biz.sicCode,
          employeeCount: biz.employeeCount,
          annualRevenue: biz.annualRevenue,
          yearsInBusiness: biz.yearsInBusiness,
          yearEstablished: biz.yearEstablished,
          ownerName: biz.ownerName,
        });

        return {
          ...biz,
          tags,
          priority,
        };
      });

      // Apply filters
      let filtered = taggedBusinesses;

      if (tagFilter && Array.isArray(tagFilter) && tagFilter.length > 0) {
        filtered = filtered.filter((b) =>
          tagFilter.some((t: string) => b.tags.includes(t)),
        );
      }

      if (
        priorityFilter &&
        Array.isArray(priorityFilter) &&
        priorityFilter.length > 0
      ) {
        filtered = filtered.filter((b) => priorityFilter.includes(b.priority));
      }

      // Generate campaigns for each type
      const campaigns: Campaign[] = [];
      const usedIds = new Set<string>(); // Track used business IDs to avoid duplicates

      for (const campaignType of campaignTypes) {
        const campaignId = generateCampaignId(campaignType);
        const messageTemplateId = generateMessageTemplateId(campaignType);

        // Filter based on campaign type requirements
        let eligibleTargets = filtered.filter((b) => {
          // Don't reuse same business in multiple campaigns
          if (usedIds.has(b.id)) return false;

          // Check requirements based on campaign type
          switch (campaignType) {
            case "CALL":
              return b.ownerPhone; // Need phone for calls
            case "SMS_INITIAL":
            case "SMS_RETARGET_NC":
            case "SMS_NURTURE":
            case "SMS_NUDGE":
              return b.ownerPhone; // Need phone for SMS
            case "EMAIL_INITIAL":
            case "EMAIL_FOLLOWUP":
              return b.ownerEmail; // Need email
            default:
              return true;
          }
        });

        // Take up to maxPerCampaign
        eligibleTargets = eligibleTargets.slice(0, maxPerCampaign);

        // Mark as used
        eligibleTargets.forEach((b) => usedIds.add(b.id));

        // Build campaign targets
        const targets: CampaignTarget[] = eligibleTargets.map((biz, index) => ({
          // Unique IDs
          targetId: generateTargetId(campaignId, index + 1),
          leadId: biz.id,
          campaignId,
          messageTemplateId,

          // Contact info
          ownerName:
            biz.ownerName ||
            `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim() ||
            "Unknown",
          ownerFirstName:
            biz.ownerFirstName || biz.ownerName?.split(" ")[0] || "",
          ownerLastName:
            biz.ownerLastName ||
            biz.ownerName?.split(" ").slice(1).join(" ") ||
            "",
          companyName: biz.companyName,
          phone: biz.ownerPhone || undefined,
          phoneType: "unknown" as const,
          email: biz.ownerEmail || undefined,
          address: biz.address || undefined,
          city: biz.city || undefined,
          state: biz.state || undefined,

          // Business context
          sicCode: biz.sicCode || undefined,
          sicDescription: biz.sicDescription || undefined,
          employeeCount: biz.employeeCount || undefined,
          annualRevenue: biz.annualRevenue || undefined,

          // Tags & Priority
          tags: biz.tags,
          priority: biz.priority,

          // Campaign assignment
          campaignType,
          scheduledFor: scheduledStartDate,
          sequence: index + 1,
        }));

        // Count priorities
        const highPriorityCount = targets.filter(
          (t) => t.priority === "high",
        ).length;
        const mediumPriorityCount = targets.filter(
          (t) => t.priority === "medium",
        ).length;

        // Campaign name
        const campaignNames: Record<CampaignType, string> = {
          CALL: "Power Dialer - Scheduled Calls",
          SMS_INITIAL: "SMS Initial Outreach",
          SMS_RETARGET_NC: "SMS Retarget (No Contact)",
          SMS_NURTURE: "SMS Nurture Sequence",
          SMS_NUDGE: "SMS Final Nudge",
          EMAIL_INITIAL: "Email Initial Outreach",
          EMAIL_FOLLOWUP: "Email Follow-up Sequence",
        };

        campaigns.push({
          campaignId,
          campaignType,
          messageTemplateId,
          name: campaignNames[campaignType],
          description: `${targets.length} targets for ${campaignType} campaign`,
          createdAt: new Date().toISOString(),
          scheduledStartDate,
          targetCount: targets.length,
          highPriorityCount,
          mediumPriorityCount,
          targets,
        });
      }

      // Summary
      const summary = campaigns.map((c) => ({
        campaignId: c.campaignId,
        campaignType: c.campaignType,
        messageTemplateId: c.messageTemplateId,
        name: c.name,
        targetCount: c.targetCount,
        highPriority: c.highPriorityCount,
        mediumPriority: c.mediumPriorityCount,
      }));

      return NextResponse.json({
        success: true,
        action: "generate",
        generatedAt: new Date().toISOString(),
        totalBusinessesScanned: allBusinesses.length,
        afterFiltering: filtered.length,
        campaigns: summary,
        fullCampaigns: campaigns,
        uniqueIds: {
          description: "Each record has unique IDs for tracking",
          example: {
            targetId:
              campaigns[0]?.targets[0]?.targetId ||
              "CALL-20241214-ABC123-T00001",
            leadId: campaigns[0]?.targets[0]?.leadId || "uuid-of-business",
            campaignId: campaigns[0]?.campaignId || "CALL-20241214-ABC123",
            messageTemplateId:
              campaigns[0]?.messageTemplateId ||
              "CALL-SCRIPT-001-1734123456789",
          },
        },
      });
    }

    // ============================================================
    // ACTION: GET-CAMPAIGN - Get specific campaign by ID
    // ============================================================
    if (action === "get-campaign") {
      const { campaignId } = body;
      // In production, this would fetch from database
      return NextResponse.json({
        success: true,
        message: "Campaign lookup - implement with database storage",
        campaignId,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid action. Use: generate, get-campaign",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[LUCI Campaigns] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    agent: "LUCI",
    endpoint: "Campaign Generator",
    maxPerCampaign: MAX_PER_CAMPAIGN,
    campaignTypes: [
      {
        type: "CALL",
        description: "2K calls scheduled on calendar",
        requirement: "phone",
      },
      {
        type: "SMS_INITIAL",
        description: "2K initial SMS outreach",
        requirement: "phone",
      },
      {
        type: "SMS_RETARGET_NC",
        description: "2K retarget (No Contact)",
        requirement: "phone",
      },
      {
        type: "SMS_NURTURE",
        description: "Nurture sequence",
        requirement: "phone",
      },
      { type: "SMS_NUDGE", description: "Final nudge", requirement: "phone" },
      {
        type: "EMAIL_INITIAL",
        description: "Initial email",
        requirement: "email",
      },
      {
        type: "EMAIL_FOLLOWUP",
        description: "Follow-up email",
        requirement: "email",
      },
    ],
    uniqueIds: {
      targetId:
        "Unique ID for each target in campaign (e.g., CALL-20241214-ABC123-T00001)",
      leadId: "Business/Lead UUID from database",
      campaignId: "Unique campaign ID (e.g., CALL-20241214-ABC123)",
      messageTemplateId:
        "Message template ID (e.g., CALL-SCRIPT-001-1734123456789)",
    },
    usage: {
      generate:
        "POST { action: 'generate', campaignTypes: ['CALL', 'SMS_INITIAL'], maxPerCampaign: 2000 }",
    },
  });
}
