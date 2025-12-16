"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  UserSearch,
  Database,
  Cloud,
  Keyboard,
  Terminal,
  HelpCircle,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 p-8">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Quick Reference</h1>
            <p className="text-zinc-400 mt-1">
              Your tools and shortcuts at a glance
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Section 1: Your AI Tools */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Your AI Tools
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-5 w-5 text-blue-400" />
                  Property Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400">
                  Find properties by location, owner type, equity, and more.
                  Access 150M+ properties nationwide.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserSearch className="h-5 w-5 text-emerald-400" />
                  Owner Lookup
                  <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded">
                    Bulk available
                  </span>
                </CardTitle>
                <CardDescription>Get owner contact info for outreach</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Phone numbers (mobile & landline)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Email addresses
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Current & past addresses
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Age & job history
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-purple-400" />
                  Your Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400">
                  Access your saved searches, leads, and campaign data. Query
                  anything you've saved.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cloud className="h-5 w-5 text-amber-400" />
                  Deployments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400">
                  Manage app updates, background jobs, and system deployments
                  from one place.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 2: Keyboard Shortcuts */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            Keyboard Shortcuts
          </h2>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Stop current task</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      Ctrl + C
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Clear screen</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      Ctrl + L
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Undo last change</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      Esc → Esc
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Switch modes</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      Shift + Tab
                    </kbd>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Save a note</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      # your note
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Run a command</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      ! command
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Reference a file</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      @ filename
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Switch model</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
                      Alt + P
                    </kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Quick Commands */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full" />
            Quick Commands
          </h2>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/help</code>
                  <span className="text-zinc-400 text-sm">Get help anytime</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/clear</code>
                  <span className="text-zinc-400 text-sm">Start fresh</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/cost</code>
                  <span className="text-zinc-400 text-sm">Check your usage</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/model</code>
                  <span className="text-zinc-400 text-sm">Switch AI model</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/compact</code>
                  <span className="text-zinc-400 text-sm">Compress conversation</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <code className="text-blue-400 font-mono text-sm">/resume</code>
                  <span className="text-zinc-400 text-sm">Continue previous chat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tip */}
        <div className="text-center text-zinc-500 text-sm pt-4">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">?</kbd> in Claude Code to see all available shortcuts
        </div>
      </div>
    </div>
  );
}
