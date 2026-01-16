/**
 * ADMIN PHONE NUMBERS API
 *
 * Manages phone numbers across all teams via SignalHouse.
 * Provides centralized view of number inventory, assignment, and usage.
 *
 * SignalHouse Leverage:
 * - All number provisioning goes through SignalHouse API
 * - Local DB (teamPhoneNumbers) acts as cache/mapping layer
 * - Webhook updates sync status changes automatically
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  teamPhoneNumbers,
  signalhouseBrands,
  signalhouseCampaigns,
} from "@/lib/db/schema";
import { eq, sql, desc, and, isNull, like, count, sum } from "drizzle-orm";
import {
  searchNumbers,
  purchaseNumber,
  getOwnedNumbers,
  releaseNumber,
  type SearchNumbersOptions,
} from "@/lib/signalhouse/client";

// ============ GET: List all phone numbers ============

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    switch (action) {
      case "list": {
        // Build query conditions
        const conditions = [];
        if (teamId) conditions.push(eq(teamPhoneNumbers.teamId, teamId));
        if (status) conditions.push(eq(teamPhoneNumbers.status, status));

        // Get paginated numbers from local DB
        const offset = (page - 1) * limit;
        const numbers = await db
          .select()
          .from(teamPhoneNumbers)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(teamPhoneNumbers.createdAt))
          .limit(limit)
          .offset(offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(teamPhoneNumbers)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        return NextResponse.json({
          success: true,
          data: {
            numbers,
            pagination: {
              page,
              limit,
              total: countResult?.count || 0,
              pages: Math.ceil((countResult?.count || 0) / limit),
            },
          },
        });
      }

      case "inventory": {
        // Get inventory summary by status and type
        const inventory = await db
          .select({
            status: teamPhoneNumbers.status,
            numberType: teamPhoneNumbers.numberType,
            count: count(),
          })
          .from(teamPhoneNumbers)
          .groupBy(teamPhoneNumbers.status, teamPhoneNumbers.numberType);

        const byTeam = await db
          .select({
            teamId: teamPhoneNumbers.teamId,
            count: count(),
            activeCount: sql<number>`COUNT(CASE WHEN ${teamPhoneNumbers.status} = 'active' THEN 1 END)`,
          })
          .from(teamPhoneNumbers)
          .groupBy(teamPhoneNumbers.teamId);

        const unassigned = await db
          .select({ count: count() })
          .from(teamPhoneNumbers)
          .where(isNull(teamPhoneNumbers.assignedTo));

        return NextResponse.json({
          success: true,
          data: {
            inventory,
            byTeam,
            unassignedCount: unassigned[0]?.count || 0,
          },
        });
      }

      case "search-available": {
        // Search for available numbers from SignalHouse
        const areaCode = searchParams.get("areaCode");
        const state = searchParams.get("state");
        const numberType = searchParams.get("numberType") as
          | "local"
          | "tollfree"
          | undefined;
        const searchLimit = parseInt(
          searchParams.get("searchLimit") || "20",
          10,
        );

        const options: SearchNumbersOptions = {
          limit: searchLimit,
        };

        if (areaCode) options.areaCode = areaCode;
        if (state) options.state = state;
        if (numberType) options.numberType = numberType;

        const result = await searchNumbers(options);

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case "signalhouse-sync": {
        // Sync owned numbers from SignalHouse
        const ownedResult = await getOwnedNumbers();
        if (!ownedResult.success) {
          return NextResponse.json(
            { success: false, error: ownedResult.error },
            { status: 500 },
          );
        }

        const signalhouseNumbers = ownedResult.data || [];
        const localNumbers = await db.select().from(teamPhoneNumbers);

        const localMap = new Map(localNumbers.map((n) => [n.phoneNumber, n]));
        const signalhouseMap = new Map(
          signalhouseNumbers.map((n) => [n.phoneNumber, n]),
        );

        const toAdd: any[] = [];
        const toUpdate: any[] = [];
        const missing: string[] = [];

        // Find numbers in SignalHouse but not locally
        for (const [phoneNumber, shNumber] of signalhouseMap) {
          if (!localMap.has(phoneNumber)) {
            toAdd.push(shNumber);
          }
        }

        // Find numbers locally but not in SignalHouse (released?)
        for (const [phoneNumber, localNumber] of localMap) {
          if (
            !signalhouseMap.has(phoneNumber) &&
            localNumber.status === "active"
          ) {
            missing.push(phoneNumber);
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            signalhouseCount: signalhouseNumbers.length,
            localCount: localNumbers.length,
            toAdd: toAdd.length,
            missing: missing.length,
            details: { toAdd, missing },
          },
        });
      }

      case "usage": {
        // Get usage stats across all numbers
        const usageStats = await db
          .select({
            totalSms: sum(teamPhoneNumbers.smsCount),
            totalMms: sum(teamPhoneNumbers.mmsCount),
            totalVoiceMinutes: sum(teamPhoneNumbers.voiceMinutes),
            totalNumbers: count(),
            activeNumbers: sql<number>`COUNT(CASE WHEN ${teamPhoneNumbers.status} = 'active' THEN 1 END)`,
          })
          .from(teamPhoneNumbers);

        return NextResponse.json({
          success: true,
          data: usageStats[0] || {},
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Admin Phone Numbers GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    );
  }
}

// ============ POST: Purchase or assign numbers ============

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "purchase": {
        // Purchase a number from SignalHouse
        const { phoneNumber, teamId, numberType = "local" } = body;

        if (!phoneNumber || !teamId) {
          return NextResponse.json(
            { success: false, error: "phoneNumber and teamId are required" },
            { status: 400 },
          );
        }

        // Call SignalHouse to purchase
        const purchaseResult = await purchaseNumber(phoneNumber);
        if (!purchaseResult.success) {
          return NextResponse.json(
            { success: false, error: purchaseResult.error },
            { status: 500 },
          );
        }

        // Store in local DB with team mapping
        // Cast to any for API response fields not in our interface
        const purchaseData = purchaseResult.data as any;
        const id = crypto.randomUUID();
        await db.insert(teamPhoneNumbers).values({
          id,
          teamId,
          phoneNumber,
          formattedNumber: formatPhoneNumber(phoneNumber),
          areaCode: phoneNumber.slice(2, 5),
          signalhouseId: purchaseData?.numberId || purchaseData?.id || phoneNumber,
          orderId: purchaseData?.orderId,
          numberType,
          status: "active",
          provisionedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          data: {
            id,
            phoneNumber,
            teamId,
            signalhouseId: purchaseData?.numberId || purchaseData?.id,
          },
        });
      }

      case "assign": {
        // Assign an existing number to a team member
        const { phoneNumberId, assignedTo, isPrimary } = body;

        if (!phoneNumberId) {
          return NextResponse.json(
            { success: false, error: "phoneNumberId is required" },
            { status: 400 },
          );
        }

        await db
          .update(teamPhoneNumbers)
          .set({
            assignedTo,
            isPrimary: isPrimary || false,
            updatedAt: new Date(),
          })
          .where(eq(teamPhoneNumbers.id, phoneNumberId));

        return NextResponse.json({ success: true });
      }

      case "transfer": {
        // Transfer a number to a different team
        const { phoneNumberId, newTeamId } = body;

        if (!phoneNumberId || !newTeamId) {
          return NextResponse.json(
            {
              success: false,
              error: "phoneNumberId and newTeamId are required",
            },
            { status: 400 },
          );
        }

        await db
          .update(teamPhoneNumbers)
          .set({
            teamId: newTeamId,
            assignedTo: null, // Clear assignment on transfer
            isPrimary: false,
            updatedAt: new Date(),
          })
          .where(eq(teamPhoneNumbers.id, phoneNumberId));

        return NextResponse.json({ success: true });
      }

      case "attach-campaign": {
        // Attach a number to a 10DLC campaign
        const { phoneNumberId, brandId, campaignId } = body;

        if (!phoneNumberId) {
          return NextResponse.json(
            { success: false, error: "phoneNumberId is required" },
            { status: 400 },
          );
        }

        await db
          .update(teamPhoneNumbers)
          .set({
            brandId,
            campaignId,
            tenDlcStatus: campaignId ? "PENDING" : null,
            updatedAt: new Date(),
          })
          .where(eq(teamPhoneNumbers.id, phoneNumberId));

        return NextResponse.json({ success: true });
      }

      case "bulk-import": {
        // Import numbers from SignalHouse inventory
        const { teamId } = body;

        if (!teamId) {
          return NextResponse.json(
            { success: false, error: "teamId is required" },
            { status: 400 },
          );
        }

        const ownedResult = await getOwnedNumbers();
        if (!ownedResult.success) {
          return NextResponse.json(
            { success: false, error: ownedResult.error },
            { status: 500 },
          );
        }

        const signalhouseNumbers = ownedResult.data || [];
        const localNumbers = await db.select().from(teamPhoneNumbers);
        const localSet = new Set(localNumbers.map((n) => n.phoneNumber));

        let imported = 0;
        for (const shNumber of signalhouseNumbers) {
          if (!localSet.has(shNumber.phoneNumber)) {
            const id = crypto.randomUUID();
            // Cast to any for API response fields not in our interface
            const num = shNumber as any;
            await db.insert(teamPhoneNumbers).values({
              id,
              teamId,
              phoneNumber: shNumber.phoneNumber,
              formattedNumber: formatPhoneNumber(shNumber.phoneNumber),
              areaCode: shNumber.phoneNumber.slice(2, 5),
              signalhouseId: num.numberId || num.id || shNumber.phoneNumber,
              numberType: num.type || "local",
              status: "active",
              capabilities: {
                sms: num.sms !== false,
                mms: num.mms === true,
                voice: num.voice === true,
                fax: false,
              },
              provisionedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            imported,
            total: signalhouseNumbers.length,
            skipped: signalhouseNumbers.length - imported,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Admin Phone Numbers POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    );
  }
}

// ============ DELETE: Release a number ============

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumberId = searchParams.get("id");
    const releaseFromSignalhouse = searchParams.get("release") !== "false";

    if (!phoneNumberId) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 },
      );
    }

    // Get the number first
    const [number] = await db
      .select()
      .from(teamPhoneNumbers)
      .where(eq(teamPhoneNumbers.id, phoneNumberId));

    if (!number) {
      return NextResponse.json(
        { success: false, error: "Phone number not found" },
        { status: 404 },
      );
    }

    // Release from SignalHouse if requested
    if (releaseFromSignalhouse && number.signalhouseId) {
      const releaseResult = await releaseNumber(number.signalhouseId);
      if (!releaseResult.success) {
        console.warn(
          "[Admin Phone Numbers DELETE] SignalHouse release failed:",
          releaseResult.error,
        );
        // Continue with local update anyway
      }
    }

    // Update local record
    await db
      .update(teamPhoneNumbers)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamPhoneNumbers.id, phoneNumberId));

    return NextResponse.json({
      success: true,
      data: { phoneNumber: number.phoneNumber, status: "released" },
    });
  } catch (error) {
    console.error("[Admin Phone Numbers DELETE]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    );
  }
}

// ============ HELPERS ============

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
