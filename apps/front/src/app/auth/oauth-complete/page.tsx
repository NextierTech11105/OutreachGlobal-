"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, gql } from "@apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";

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
    if (email && provider) {
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
    }
  }, [email, provider, name, googleId, oauthLogin]);

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
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
