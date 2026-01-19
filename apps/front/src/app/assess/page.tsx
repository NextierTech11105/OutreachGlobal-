"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Mail,
  Check,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  Shield,
  Zap,
  Users,
  FileText,
  Target,
  BarChart3,
  Download,
  Share2,
} from "lucide-react";
import Link from "next/link";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LeadAssessmentPage() {
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Please upload a CSV file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Please upload a CSV file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }
    if (!file) {
      setError("Please upload a CSV file");
      return;
    }

    setLoading(true);

    try {
      // TODO: Send to Trestle Real Contact Assessment API
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const UploadSection = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-12 h-12 bg-black border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl"
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">CSV File</label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? "border-white bg-zinc-800"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-zinc-700 hover:border-zinc-600"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-zinc-500 text-sm">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-4 text-zinc-500 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-2">Drag and drop a file here</p>
                <p className="text-zinc-600 text-sm mb-4">- or -</p>
                <label className="cursor-pointer">
                  <span className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-semibold text-lg rounded-xl disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold">Assessment Submitted</h1>
          <p className="text-zinc-400">
            We're processing your data. You'll receive your Real Contact Data
            Assessment at{" "}
            <span className="text-white font-medium">{email}</span> within a few
            minutes.
          </p>
          <div className="pt-4 space-y-3">
            <Link href="/auth">
              <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-semibold">
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full h-12 border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              onClick={() => {
                setSubmitted(false);
                setFile(null);
                setEmail("");
              }}
            >
              Submit Another File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">NEXTIER</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500 text-sm">powered by Trestle</span>
          </div>
          <Link
            href="/auth"
            className="text-sm text-zinc-500 hover:text-white transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              Free Assessment
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Real Contact Data Assessment
          </h1>

          <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-4">
            Real Contact Data Assessment—the ultimate free tool for fast and
            reliable lead assessment. Easily upload up to 10,000 records in a
            single batch, and we'll handle the verification for free.
          </p>

          <p className="text-zinc-500 max-w-3xl mx-auto mb-12">
            Powered by our advanced Real Contact API, this tool summarizes your
            contact data into aggregate statistics to understand the health of
            your contact or lead data and compares how your data is doing
            compared to your peers.
          </p>

          <UploadSection />
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-500 text-sm mb-8">
            Trusted by leading enterprise companies serving{" "}
            <span className="text-white font-medium">2B+ queries annually</span>{" "}
            in the United States.
          </p>
          <div className="flex justify-center items-center gap-12 opacity-40">
            {/* Placeholder logos */}
            <div className="w-24 h-8 bg-zinc-800 rounded" />
            <div className="w-24 h-8 bg-zinc-800 rounded" />
            <div className="w-24 h-8 bg-zinc-800 rounded" />
            <div className="w-24 h-8 bg-zinc-800 rounded" />
            <div className="w-24 h-8 bg-zinc-800 rounded" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-4">
                1
              </div>
              <p className="text-zinc-300">
                Submit your data file in a CSV format. Please upload both{" "}
                <span className="text-white font-medium">
                  phone numbers and names
                </span>
                .
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-4">
                2
              </div>
              <p className="text-zinc-300">
                We'll process your data and send you an email with your{" "}
                <span className="text-white font-medium">aggregated report</span>
                .
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-purple-400" />
              </div>
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-4">
                3
              </div>
              <p className="text-zinc-300">
                <span className="text-white font-medium">
                  Download your results
                </span>{" "}
                and share!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Free Verification
              </h3>
              <p className="text-zinc-400 text-sm">
                Free verification for up to 10,000 records. Upload your .csv file
                and get a comprehensive report at no cost.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Sign Up Required
              </h3>
              <p className="text-zinc-400 text-sm">
                No need to make an account to get your results.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Detailed Reporting
              </h3>
              <p className="text-zinc-400 text-sm">
                Receive a clear, easy-to-read aggregated report via email with
                breakdowns on lead quality and comparisons to your peers.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Accurate Results
              </h3>
              <p className="text-zinc-400 text-sm">
                Powered by our Real Contact API for top-tier accuracy, ensuring
                you have an accurate assessment of your data's health.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Lead Grading System
              </h3>
              <p className="text-zinc-400 text-sm">
                Automatically categorize your leads based on quality:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-zinc-300">
                    High-quality, verified leads ready for engagement
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-zinc-300">
                    Medium-quality leads that may require nurturing
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-zinc-300">
                    Low-quality leads, helping you prioritize
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Privacy First
              </h3>
              <p className="text-zinc-400 text-sm">
                Your data will be immediately deleted after the lead assessment is
                processed. For more details, please review our{" "}
                <Link href="/terms" className="text-white underline">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Second Upload CTA */}
      <section className="py-16 lg:py-24 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8">
            Upload Your CSV File
          </h2>
          <UploadSection />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-bold">NEXTIER</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500 text-sm">powered by Trestle</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs">
                Identity data for seamless customer connections. U.S. coverage for
                enrichment and verification.
              </p>
            </div>

            <div className="flex gap-12 text-sm">
              <div>
                <h4 className="text-white font-medium mb-3">Company</h4>
                <ul className="space-y-2 text-zinc-500">
                  <li>
                    <Link href="/about" className="hover:text-white">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-white">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Products</h4>
                <ul className="space-y-2 text-zinc-500">
                  <li>
                    <Link href="/lead-lab" className="hover:text-white">
                      Lead Lab
                    </Link>
                  </li>
                  <li>
                    <Link href="/assess" className="hover:text-white">
                      Data Assessment
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Legal</h4>
                <ul className="space-y-2 text-zinc-500">
                  <li>
                    <Link href="/terms" className="hover:text-white">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
