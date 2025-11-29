import { NextRequest, NextResponse } from "next/server";
import { apolloIoApi, searchCommercialRealEstateB2B } from "@/lib/services/apollo-io-api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchType = searchParams.get("type") || "people";

  try {
    if (searchType === "commercial-real-estate") {
      const data = await searchCommercialRealEstateB2B({
        location: searchParams.get("location") || undefined,
        propertyType: searchParams.get("propertyType") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        perPage: parseInt(searchParams.get("perPage") || "25"),
      });
      return NextResponse.json(data);
    }

    if (searchType === "decision-makers") {
      const domain = searchParams.get("domain");
      if (!domain) {
        return NextResponse.json({ error: "Domain is required" }, { status: 400 });
      }
      const data = await apolloIoApi.searchDecisionMakers(domain);
      return NextResponse.json(data);
    }

    if (searchType === "property-owners") {
      const data = await apolloIoApi.searchPropertyOwners(
        searchParams.get("location") || undefined
      );
      return NextResponse.json(data);
    }

    if (searchType === "investment-firms") {
      const data = await apolloIoApi.searchInvestmentFirmContacts();
      return NextResponse.json(data);
    }

    // Default people search
    const data = await apolloIoApi.searchPeople({
      q_organization_name: searchParams.get("company") || undefined,
      person_titles: searchParams.get("titles")?.split(",") || undefined,
      person_locations: searchParams.get("location") ? [searchParams.get("location")!] : undefined,
      organization_locations: searchParams.get("orgLocation") ? [searchParams.get("orgLocation")!] : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      per_page: parseInt(searchParams.get("perPage") || "25"),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Apollo search error:", error);
    return NextResponse.json(
      { error: "Failed to search Apollo.io", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "search-people":
        return NextResponse.json(await apolloIoApi.searchPeople(params));

      case "search-organizations":
        return NextResponse.json(await apolloIoApi.searchOrganizations(params));

      case "enrich-person":
        return NextResponse.json(await apolloIoApi.enrichPerson(params));

      case "enrich-organization":
        return NextResponse.json(await apolloIoApi.enrichOrganization(params.domain));

      case "search-by-company":
        return NextResponse.json(
          await apolloIoApi.searchPeopleByCompany(params.domain, params)
        );

      case "b2b-prospects":
        return NextResponse.json(
          await apolloIoApi.searchB2BProspects(
            params.industry,
            params.location,
            params.employeeRange,
            params
          )
        );

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Apollo API error:", error);
    return NextResponse.json(
      { error: "Failed to call Apollo.io API", details: String(error) },
      { status: 500 }
    );
  }
}
