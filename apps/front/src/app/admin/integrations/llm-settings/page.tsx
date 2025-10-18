import { LlmSettingsManager } from "@/components/admin/llm-settings-manager";
import { LlmUsageMonitor } from "@/components/admin/llm-usage-monitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LlmSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">LLM Settings</h1>
        <p className="text-muted-foreground">
          Configure AI model providers and settings for use throughout the
          platform.
        </p>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Provider Settings</TabsTrigger>
          <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <LlmSettingsManager />
        </TabsContent>

        <TabsContent value="usage">
          <LlmUsageMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
