"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-4">
              We have been notified and are working on it.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
