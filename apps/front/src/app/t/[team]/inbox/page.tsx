import { UnifiedInbox } from "@/features/message/components/unified-inbox";
import { InboxProvider } from "@/features/message/inbox-provider";
import { TeamHeader } from "@/features/team/layouts/team-header";

export default function InboxPage() {
  return (
    <>
      <TeamHeader title="AI Inbound Response Center" />
      <InboxProvider>
        <UnifiedInbox />
      </InboxProvider>
    </>
  );
}
