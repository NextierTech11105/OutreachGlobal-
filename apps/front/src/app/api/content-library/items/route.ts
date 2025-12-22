import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { cookies } from "next/headers";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") + "/graphql" ||
  "http://localhost:3001/graphql";

// Helper to make GraphQL requests
async function gqlFetch(query: string, variables: Record<string, unknown>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("nextier_session")?.value;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

// POST - Get content items (using POST to allow body with filters)
export async function POST(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, searchQuery, contentType, tags, first = 50 } = body;
    const teamId = request.nextUrl.searchParams.get("teamId") || body.teamId;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    const query = `
      query ContentItems($teamId: String!, $categoryId: String, $contentType: String, $searchQuery: String, $tags: [String!], $first: Int) {
        contentItems(teamId: $teamId, categoryId: $categoryId, contentType: $contentType, searchQuery: $searchQuery, tags: $tags, first: $first) {
          edges {
            node {
              id
              title
              content
              description
              contentType
              tags
              usageCount
              isFavorite
              isActive
              createdAt
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const data = await gqlFetch(query, {
      teamId,
      categoryId: categoryId || null,
      contentType: contentType || null,
      searchQuery: searchQuery || null,
      tags: tags || null,
      first,
    });

    const items =
      data.contentItems?.edges?.map((edge: { node: unknown }) => edge.node) ||
      [];

    return NextResponse.json({
      items,
      totalCount: data.contentItems?.totalCount || 0,
      pageInfo: data.contentItems?.pageInfo,
    });
  } catch (error) {
    console.error("Content items fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content items" },
      { status: 500 },
    );
  }
}

// PUT - Create new content item
export async function PUT(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      description,
      contentType,
      categoryId,
      tags,
      teamId,
    } = body;

    if (!title || !content || !teamId) {
      return NextResponse.json(
        { error: "title, content, and teamId are required" },
        { status: 400 },
      );
    }

    const mutation = `
      mutation CreateContentItem($teamId: String!, $input: CreateContentItemInput!) {
        createContentItem(teamId: $teamId, input: $input) {
          contentItem {
            id
            title
            content
            description
            contentType
            tags
            isActive
            createdAt
            updatedAt
          }
        }
      }
    `;

    const data = await gqlFetch(mutation, {
      teamId,
      input: {
        title,
        content,
        description: description || null,
        contentType: contentType || "prompt",
        categoryId: categoryId || null,
        tags: tags || [],
      },
    });

    return NextResponse.json(data.createContentItem?.contentItem, {
      status: 201,
    });
  } catch (error) {
    console.error("Content item create error:", error);
    return NextResponse.json(
      { error: "Failed to create content item" },
      { status: 500 },
    );
  }
}
