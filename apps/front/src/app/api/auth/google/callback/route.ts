import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[Google OAuth] Error:", error);
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=oauth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=invalid_request`
      );
    }

    // Verify state (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=invalid_state`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Google OAuth] Token error:", await tokenResponse.text());
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=token_error`
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=userinfo_error`
      );
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    console.log("[Google OAuth] User info received:", { 
      id: googleUser.id, 
      email: googleUser.email, 
      hasName: !!googleUser.name,
      verified: googleUser.verified_email 
    });

    if (!googleUser.verified_email) {
      console.warn("[Google OAuth] Email not verified:", googleUser.email);
      return NextResponse.redirect(
        `${APP_URL}/auth/login?error=email_not_verified`
      );
    }

    // Fallback for name if missing
    const userName = googleUser.name || 
                    (googleUser.given_name ? `${googleUser.given_name} ${googleUser.family_name || ''}` : '') || 
                    "User";

    // Redirect to oauth-complete for both login and registration
    // The backend will auto-register new users
    const targetUrl = new URL(`${APP_URL}/auth/oauth-complete`);
    targetUrl.searchParams.set("email", googleUser.email);
    targetUrl.searchParams.set("name", userName.trim());
    targetUrl.searchParams.set("googleId", googleUser.id);
    targetUrl.searchParams.set("provider", "google");

    const response = NextResponse.redirect(targetUrl);

    // Clear OAuth state cookie
    response.cookies.delete("oauth_state");
    return response;
  } catch (error: any) {
    console.error("[Google OAuth] Callback error:", error);
    // Log env vars for debugging (careful with secrets)
    console.error("[Google OAuth] Env Context:", {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      appUrl: APP_URL
    });
    
    return NextResponse.redirect(
      `${APP_URL}/auth/login?error=server_error`
    );
  }
}
