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

  const [oauthLogin] = useMutation(OAUTH_LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { token, team } = data.oauthLogin;
      $cookie.set("token", token, { expires: addMonths(new Date(), 1) });
      router.push(`/t/${team.slug}`);
    },
    onError: (err) => {
      console.error("[OAuth] Login error:", err);
      setError(err.message);
    },
  });

  useEffect(() => {
    if (email && provider) {
      oauthLogin({
        variables: {
          input: { email, provider },
        },
      });
    }
  }, [email, provider, oauthLogin]);

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
