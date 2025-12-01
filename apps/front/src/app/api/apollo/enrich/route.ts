import { NextRequest, NextResponse } from "next/server";

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { email, domain, firstName, lastName } = await request.json();

    if (!APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 400 }
      );
    }

    if (!email && !domain) {
      return NextResponse.json(
        { error: "Email or domain is required for enrichment" },
        { status: 400 }
      );
    }

    // Build enrichment request
    const enrichParams: Record<string, unknown> = {};

    if (email) {
      enrichParams.email = email;
    }

    if (domain) {
      enrichParams.domain = domain;
    }

    if (firstName) {
      enrichParams.first_name = firstName;
    }

    if (lastName) {
      enrichParams.last_name = lastName;
    }

    const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(enrichParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Enrichment failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const person = data.person;

    if (!person) {
      return NextResponse.json({
        success: true,
        result: {
          id: crypto.randomUUID(),
          name: "Unknown",
          email: email || "",
          title: "",
          company: "",
          phone: "",
          linkedin: "",
          status: "not_found",
          enrichedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      result: {
        id: person.id,
        name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        email: person.email || email || "",
        title: person.title || "",
        company: person.organization?.name || "",
        phone: person.phone_numbers?.[0]?.sanitized_number || "",
        linkedin: person.linkedin_url || "",
        status: "found",
        enrichedAt: new Date().toISOString(),
      },
      raw: person,
    });
  } catch (error: unknown) {
    console.error("Apollo enrich error:", error);
    const message = error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
