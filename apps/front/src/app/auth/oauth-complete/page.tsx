"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, gql } from "@apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";

// Platform owners - Thomas Borruso and Frank Mirando
const PLATFORM_OWNERS = [
  "tb@outreachglobal.io",
  "fm@outreachglobal.io",
];

const OAUTH_LOGIN_MUTATION = gql`
  mutation OAuthLogin($input: OAuthLoginInput!) {
    oauthLogin(input: $input) {
      token
      user {
        id
        email
        name
      }
      team {
        id
        slug
        name
      }
    }
  }
`;

export default function OAuthCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const email = searchParams.get("email");
  const provider = searchParams.get("provider");
  const name = searchParams.get("name");
  const googleId = searchParams.get("googleId");

  const [oauthLogin] = useMutation(OAUTH_LOGIN_MUTATION, {
    onCompleted: (data) => {
      console.log("[OAuth] Response:", data);

      if (!data?.oauthLogin) {
        setError("Login failed - no response from server");
        return;
      }

      const { token, team } = data.oauthLogin;

      if (!token || !team?.slug) {
        setError("Login failed - missing token or team");
        return;
      }

      $cookie.set("session", token, { expires: addMonths(new Date(), 10) });
      router.push(`/t/${team.slug}`);
    },
    onError: (err) => {
      console.error("[OAuth] Login error:", err);
      console.error("[OAuth] Error details:", JSON.stringify(err, null, 2));
      setError(err.message || "Login failed");
    },
  });

  useEffect(() => {
    if (!email || !provider) return;

    const emailLower = email.toLowerCase();
    const isPlatformOwner = PLATFORM_OWNERS.includes(emailLower);

    if (isPlatformOwner) {
      // Platform owner - proceed with login
      oauthLogin({
        variables: {
          input: {
            email,
            provider,
            ...(name && { name }),
            ...(googleId && { googleId }),
          },
        },
      });
    } else {
      // New user - capture as HOT LEAD and add to nurture queues
      setCapturing(true);

      fetch("/api/leads/capture-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailLower,
          name: name || "",
          source: "google_oauth",
          provider: "google",
          isHotLead: true, // Mark as hot lead - they tried to sign up!
          leadScore: 90, // High score for sign-up intent
          // Queue assignments for nurturing
          addToCallQueue: true, // Add to call queue for follow-up
          addToDripQueue: true, // Add to drip/nurture campaign
          tags: ["google_signup", "hot_lead", "nurture"],
        }),
      })
        .catch(() => {}) // Silent fail - still redirect
        .finally(() => {
          // Redirect to access-granted page
          router.push(`/auth/access-granted?email=${encodeURIComponent(emailLower)}&name=${encodeURIComponent(name || "")}`);
        });
    }
  }, [email, provider, name, googleId, oauthLogin, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Login Failed</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a href="/auth/login" className="text-primary underline">
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {capturing ? "Processing your request..." : "Completing sign in..."}
        </p>
      </div>
    </div>
  );
}
