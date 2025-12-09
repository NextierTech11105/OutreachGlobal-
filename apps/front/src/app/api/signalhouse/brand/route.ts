import { NextRequest, NextResponse } from "next/server";
import {
  createBrand,
  getBrand,
  getBrandByName,
  deleteBrand,
  getBasicBrandDetails,
  isConfigured,
  type CreateBrandInput,
} from "@/lib/signalhouse/client";

// GET - List brands or get specific brand
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const brandName = searchParams.get("brandName");

  try {
    // Get specific brand by ID
    if (brandId) {
      const result = await getBrand(brandId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true, brand: result.data });
    }

    // Get specific brand by name
    if (brandName) {
      const result = await getBrandByName(brandName);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true, brand: result.data });
    }

    // List all brands
    const result = await getBasicBrandDetails();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      brands: result.data || [],
    });
  } catch (error) {
    console.error("[SignalHouse Brand] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get brands" },
      { status: 500 }
    );
  }
}

// POST - Create a new brand (10DLC registration)
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.legalCompanyName || !body.brandName) {
      return NextResponse.json(
        { error: "legalCompanyName and brandName are required" },
        { status: 400 }
      );
    }

    const input: CreateBrandInput = {
      legalCompanyName: body.legalCompanyName,
      brandName: body.brandName,
      ein: body.ein || body.taxId,
      country: body.country || "US",
      state: body.state,
      city: body.city,
      street: body.street || body.address,
      postalCode: body.postalCode || body.zip,
      website: body.website,
      vertical: body.vertical || body.industry,
      entityType: body.entityType || "PRIVATE_PROFIT",
    };

    const result = await createBrand(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      brand: result.data,
      message: "Brand registration submitted. Status will update once verified.",
    });
  } catch (error) {
    console.error("[SignalHouse Brand] Create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create brand" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a brand
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  try {
    const result = await deleteBrand(brandId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: "Brand deleted" });
  } catch (error) {
    console.error("[SignalHouse Brand] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete brand" },
      { status: 500 }
    );
  }
}
