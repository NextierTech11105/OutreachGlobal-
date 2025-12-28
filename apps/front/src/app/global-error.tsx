"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-zinc-400">500</h1>
          <h2 className="mt-4 text-2xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-zinc-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
