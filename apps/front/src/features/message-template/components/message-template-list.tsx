"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { CreateMessageTemplateButton } from "@/features/message-template/components/create-message-template-button";
import { MessageTemplateType } from "@/graphql/types";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { MESSAGE_TEMPLATES_QUERY } from "../queries/message-template.queries";
import { MessageTemplateCard } from "./message-template-card";
import { Loading } from "@/components/ui/loading";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createDefaultCursor } from "@/graphql/graphql-utils";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({ first: LIMIT });

export function MessageTemplateList() {
  const [activeTab, setActiveTab] = useState<MessageTemplateType>(
    MessageTemplateType.EMAIL,
  );
  const [cursor, setCursor] = useState(defaultCursor);

  const { team } = useCurrentTeam();
  const [templates, pageInfo, { loading }] = useConnectionQuery(
    MESSAGE_TEMPLATES_QUERY,
    {
      pick: "messageTemplates",
      variables: { ...cursor, teamId: team.id, types: [activeTab] },
    },
  );

  useEffect(() => {
    setCursor(defaultCursor);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={MessageTemplateType as any}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MessageTemplateType)}
      >
        <div className="flex flex-col lg:flex-row gap-2 justify-between items-center">
          <TabsList>
            <TabsTrigger
              value={MessageTemplateType.EMAIL}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>Email Templates</span>
            </TabsTrigger>
            <TabsTrigger
              value={MessageTemplateType.SMS}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>SMS Templates</span>
            </TabsTrigger>
            <TabsTrigger
              value={MessageTemplateType.VOICE}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span>Voice Templates</span>
            </TabsTrigger>
          </TabsList>

          <CreateMessageTemplateButton type={activeTab} />
        </div>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="lg:col-span-3 flex justify-center items-center">
            <Loading />
          </div>
        )}

        {templates?.map((template) => (
          <MessageTemplateCard key={template.id} template={template} />
        ))}

        {!loading && !templates?.length && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>No {activeTab} templates found</CardTitle>
                <CardDescription>
                  You don't have any {activeTab} templates yet. Create one now.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>

      {!!pageInfo && (
        <CursorPagination
          data={pageInfo}
          onPageChange={setCursor}
          limit={LIMIT}
          className="mt-4"
        />
      )}
    </div>
  );
}
