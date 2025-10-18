import { InjectDB } from "@/database/decorators";
import { ModelNotFoundError, orFail } from "@/database/exceptions";
import { DrizzleClient } from "@/database/types";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import {
  CreateMessageTemplateArgs,
  DeleteMessageTemplateArgs,
  FindOneMessageTemplateArgs,
  GenerateMessageTemplateArgs,
  MessageTemplateConnectionArgs,
  UpdateMessageTemplateArgs,
} from "../args/message-template.args";
import { messageTemplatesTable } from "@/database/schema-alias";
import { DatabaseService } from "@/database/services/database.service";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { MessageTemplateType } from "@nextier/common";
import {
  createEmailTemplateSchema,
  createSmsTemplateSchema,
  createVoiceTemplateSchema,
} from "@nextier/dto";
import { inArrayIfNotEmpty } from "@/database/expressions";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

@Injectable()
export class MessageTemplateService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  getSchema(type: MessageTemplateType) {
    switch (type) {
      case MessageTemplateType.SMS:
        return createSmsTemplateSchema;
      case MessageTemplateType.EMAIL:
        return createEmailTemplateSchema;
      case MessageTemplateType.VOICE:
        return createVoiceTemplateSchema;
    }
  }

  async generate(options: GenerateMessageTemplateArgs) {
    try {
      const result = await generateText({
        model: anthropic("claude-4-opus-20250514"),
        prompt: options.prompt,
      });
      return {
        content: result.text,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  paginate(options: MessageTemplateConnectionArgs) {
    const query = this.db
      .select()
      .from(messageTemplatesTable)
      .where((t) =>
        and(
          eq(t.teamId, options.teamId),
          inArrayIfNotEmpty(t.type, options.types),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id)],
    });
  }

  async findOneOrFail({ id, teamId }: FindOneMessageTemplateArgs) {
    const messageTemplate = await this.db.query.messageTemplates
      .findFirst({
        where: (t) => and(eq(t.id, id), eq(t.teamId, teamId)),
      })
      .then(orFail("message template"));
    return messageTemplate;
  }

  async create(options: CreateMessageTemplateArgs) {
    const [messageTemplate] = await this.db
      .insert(messageTemplatesTable)
      .values({
        type: options.type,
        teamId: options.teamId,
        ...options.input,
      })
      .returning();

    return { messageTemplate };
  }

  async update(options: UpdateMessageTemplateArgs) {
    const [messageTemplate] = await this.db
      .update(messageTemplatesTable)
      .set({
        type: options.type,
        ...options.input,
      })
      .where(
        and(
          eq(messageTemplatesTable.id, options.id),
          eq(messageTemplatesTable.teamId, options.teamId),
        ),
      )
      .returning();

    return { messageTemplate };
  }

  async remove(options: DeleteMessageTemplateArgs) {
    const [messageTemplate] = await this.db
      .delete(messageTemplatesTable)
      .where(
        and(
          eq(messageTemplatesTable.id, options.id),
          eq(messageTemplatesTable.teamId, options.teamId),
        ),
      )
      .returning({ id: messageTemplatesTable.id });

    if (!messageTemplate) {
      throw new ModelNotFoundError("message template not found");
    }

    return { deletedMessageTemplateId: messageTemplate.id };
  }
}
