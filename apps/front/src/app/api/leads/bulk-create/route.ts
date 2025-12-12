import { NextRequest, NextResponse } from "next/server";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app/graphql";

interface BulkCreateLeadInput {
  teamId: string;
  propertyIds: string[];
  source?: string;
  tags?: string[];
  filters?: {
    state?: string;
    county?: string;
    city?: string;
    propertyType?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkCreateLeadInput = await request.json();
    const {
      teamId,
      propertyIds,
      source = "Property Search",
      tags = [],
      filters,
    } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    if (!propertyIds || propertyIds.length === 0) {
      return NextResponse.json(
        { error: "propertyIds are required" },
        { status: 400 },
      );
    }

    // Limit to 100 at a time to avoid timeout
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < propertyIds.length; i += batchSize) {
      batches.push(propertyIds.slice(i, i + batchSize));
    }

    let totalCreated = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (propertyId) => {
          const response = await fetch(GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
                mutation CreateLead($teamId: ID!, $input: CreateLeadInput!) {
                  createLead(teamId: $teamId, input: $input) {
                    lead { id }
                  }
                }
              `,
              variables: {
                teamId,
                input: {
                  source,
                  tags: [...tags, "Property Search"],
                  address: filters?.county
                    ? `${filters.county}, ${filters.state}`
                    : undefined,
                  state: filters?.state,
                  notes: `Property ID: ${propertyId}`,
                },
              },
            }),
          });

          const data = await response.json();
          if (data.errors) {
            throw new Error(data.errors[0]?.message || "GraphQL error");
          }
          return data.data.createLead.lead.id;
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          totalCreated++;
        } else {
          errors.push(result.reason?.message || "Unknown error");
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: totalCreated,
      total: propertyIds.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Bulk create leads error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
