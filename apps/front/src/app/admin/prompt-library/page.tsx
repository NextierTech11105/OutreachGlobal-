import { PromptLibraryManager } from "@/components/admin/prompt-library-manager";

export default function PromptLibraryPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Prompt Library</h1>
        <p className="text-muted-foreground">
          Manage AI prompts for generating campaign messages
        </p>
      </div>

      <PromptLibraryManager />
    </div>
  );
}
