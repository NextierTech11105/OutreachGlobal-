import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, dealDocuments, dealActivities } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { DealDocument, DealActivity } from "../../types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List documents for a deal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Verify deal exists
    const deal = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Get documents
    const query = db
      .select()
      .from(dealDocuments)
      .where(eq(dealDocuments.dealId, dealId))
      .orderBy(desc(dealDocuments.uploadedAt));

    const documents = await query;

    // Filter by type if specified
    const filtered = type
      ? documents.filter((d) => d.type === type)
      : documents;

    return NextResponse.json({
      success: true,
      documents: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("[Deals] Get documents error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get documents",
      },
      { status: 500 },
    );
  }
}

// POST - Add document to deal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { type, name, url, size, mimeType, userId } = body;

    if (!type || !name || !url) {
      return NextResponse.json(
        { error: "type, name, and url are required" },
        { status: 400 },
      );
    }

    // Verify deal exists
    const deal = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const document: DealDocument = {
      id: uuidv4(),
      dealId,
      type,
      name,
      url,
      size,
      mimeType,
      uploadedBy: userId || "system",
      uploadedAt: now,
    };

    await db.insert(dealDocuments).values(document);

    // Log activity
    const activity: DealActivity = {
      id: uuidv4(),
      dealId,
      type: "document",
      description: `Document added: ${name} (${type})`,
      metadata: { documentId: document.id, documentType: type },
      userId: userId || "system",
      createdAt: now,
    };

    await db.insert(dealActivities).values(activity);

    // Update deal timestamp
    await db.update(deals).set({ updatedAt: now }).where(eq(deals.id, dealId));

    return NextResponse.json({
      success: true,
      document,
      message: "Document added successfully",
    });
  } catch (error) {
    console.error("[Deals] Add document error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add document",
      },
      { status: 500 },
    );
  }
}

// DELETE - Remove document from deal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

    // Verify document exists and belongs to deal
    const document = await db
      .select()
      .from(dealDocuments)
      .where(eq(dealDocuments.id, documentId))
      .limit(1);

    if (!document.length) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (document[0].dealId !== dealId) {
      return NextResponse.json(
        { error: "Document does not belong to this deal" },
        { status: 403 },
      );
    }

    // Delete document
    await db.delete(dealDocuments).where(eq(dealDocuments.id, documentId));

    // Log activity
    const activity: DealActivity = {
      id: uuidv4(),
      dealId,
      type: "document",
      description: `Document removed: ${document[0].name}`,
      userId: "system",
      createdAt: new Date().toISOString(),
    };

    await db.insert(dealActivities).values(activity);

    return NextResponse.json({
      success: true,
      message: "Document removed successfully",
    });
  } catch (error) {
    console.error("[Deals] Delete document error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 },
    );
  }
}
