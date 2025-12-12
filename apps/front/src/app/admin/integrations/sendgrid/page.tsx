import { SendgridIntegration } from "@/components/sendgrid-integration";

export default function SendgridIntegrationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            SendGrid Integration
          </h2>
        </div>
        <div className="text-muted-foreground pb-4">
          Configure SendGrid for email campaigns, notifications, and
          transactional emails.
        </div>

        <SendgridIntegration />
      </div>
    </div>
  );
}
