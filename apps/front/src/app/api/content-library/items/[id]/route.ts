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

// PATCH - Update content item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, description, contentType, tags, isActive } = body;

    const mutation = `
      mutation UpdateContentItem($id: String!, $input: UpdateContentItemInput!) {
        updateContentItem(id: $id, input: $input) {
          contentItem {
            id
            title
            content
            description
            contentType
            tags
            isActive
            updatedAt
          }
        }
      }
    `;

    const data = await gqlFetch(mutation, {
      id,
      input: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(description !== undefined && { description }),
        ...(contentType !== undefined && { contentType }),
        ...(tags !== undefined && { tags }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (!data.updateContentItem?.contentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(data.updateContentItem.contentItem);
  } catch (error) {
    console.error("Content item update error:", error);
    return NextResponse.json(
      { error: "Failed to update content item" },
      { status: 500 },
    );
  }
}

// DELETE - Remove content item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const mutation = `
      mutation DeleteContentItem($id: String!) {
        deleteContentItem(id: $id) {
          success
        }
      }
    `;

    await gqlFetch(mutation, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content item delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete content item" },
      { status: 500 },
    );
  }
}
