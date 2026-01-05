import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || "og-bootstrap-2024";

/**
 * POST /api/auth/bootstrap-owner
 *
 * Bootstrap the platform owner account.
 * Creates an OWNER_KEY for tb@outreachglobal.io
 *
 * SECURITY: Requires a secret and only works for @outreachglobal.io emails.
 * This endpoint should be called ONCE during initial setup.
 *
 * Request body:
 * {
 *   email: "tb@outreachglobal.io",
 *   secret: "og-bootstrap-2024"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   tenant: { id, name, slug, state },
 *   apiKey: { key, keyPrefix, name, type },
 *   isNew: true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    // Validate secret
    if (secret !== BOOTSTRAP_SECRET) {
      return NextResponse.json(
        { error: "Invalid bootstrap secret" },
        { status: 401 },
      );
    }

    // Only allow @outreachglobal.io emails
    if (!email || !email.endsWith("@outreachglobal.io")) {
      return NextResponse.json(
        { error: "Only @outreachglobal.io emails can bootstrap owner access" },
        { status: 403 },
      );
    }

    console.log(`[Bootstrap] Creating owner key for ${email}`);

    // Call GraphQL mutation to bootstrap owner
    const response = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation BootstrapOwner($email: String!, $secret: String!) {
            bootstrapOwner(email: $email, secret: $secret) {
              success
              tenant {
                id
                name
                slug
                state
              }
              apiKey {
                key
                keyPrefix
                name
                type
              }
              isNew
              error
            }
          }
        `,
        variables: {
          email,
          secret: BOOTSTRAP_SECRET, // Pass the backend secret
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error(`[Bootstrap] GraphQL errors:`, result.errors);
      return NextResponse.json(
        { error: result.errors[0]?.message || "Bootstrap failed" },
        { status: 500 },
      );
    }

    const bootstrap = result.data?.bootstrapOwner;

    if (!bootstrap?.success) {
      return NextResponse.json(
        { error: bootstrap?.error || "Bootstrap failed" },
        { status: 500 },
      );
    }

    console.log(`[Bootstrap] Owner key created for ${email}`);

    // IMPORTANT: The API key is shown only once!
    return NextResponse.json({
      success: true,
      tenant: bootstrap.tenant,
      apiKey: bootstrap.apiKey,
      isNew: bootstrap.isNew,
      message: bootstrap.isNew
        ? "SAVE YOUR API KEY NOW! It will not be shown again."
        : "Owner key already exists. Use rotate if you lost it.",
    });
  } catch (error: any) {
    console.error("[Bootstrap] Error:", error);
    return NextResponse.json(
      { error: error.message || "Bootstrap failed" },
      { status: 500 },
    );
  }
}
