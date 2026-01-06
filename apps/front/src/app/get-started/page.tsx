"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key } from "lucide-react";

export default function GetStartedPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    if (!apiKey.startsWith("og_")) {
      setError("Invalid key format. Keys start with 'og_'");
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem("og_api_key", apiKey.trim());
      document.cookie = `og_api_key=${apiKey.trim()}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.href = "/";
    } catch {
      setError("Failed to save key. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">OutreachGlobal</h1>
          <p className="text-zinc-400">Enter your API key to continue</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-300">
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="og_owner_..."
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
            >
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Need an API key? Contact{" "}
          <a href="mailto:tb@outreachglobal.io" className="text-zinc-400 hover:text-white">
            tb@outreachglobal.io
          </a>
        </p>
      </div>
    </div>
  );
}
