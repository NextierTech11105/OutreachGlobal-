import { LucyCopilot } from "@/components/admin/lucy-copilot";

export default function LucyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-6 p-6">
        <LucyCopilot />
      </div>
    </div>
  );
}
