import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    console.error("[Google OAuth] GOOGLE_CLIENT_ID not set in environment");
    // Redirect to login with error instead of showing JSON
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/login?error=oauth_not_configured`
    );
  }

  const state = crypto.randomUUID();
  
  // Store state in cookie for CSRF protection
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    }).toString()
  );

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
