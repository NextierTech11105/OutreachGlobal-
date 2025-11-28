import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  LeadConnectionArgs,
  LeadsCountArgs,
  FindOneLeadArgs,
  CreateLeadArgs,
  UpdateLeadArgs,
  DeleteLeadArgs,
  BulkDeleteLeadArgs,
  CreateLeadPhoneNumberArgs,
  UpdateLeadPhoneNumberArgs,
  DeleteLeadPhoneNumberArgs,
} from "../args/lead.args";
import { leadPhoneNumbersTable, leadsTable } from "@/database/schema-alias";
import {
  and,
  arrayOverlaps,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { isNumber } from "@nextier/common";
import { ModelNotFoundError, orFail } from "@/database/exceptions";
import { EventBus } from "@nestjs/cqrs";
import { LeadCreated } from "../events/lead-created.event";
import { LeadUpdated } from "../events/lead-updated.event";

@Injectable()
export class LeadService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private eventBus: EventBus,
  ) {}

  paginate(options: LeadConnectionArgs) {
    const query = this.db
      .select()
      .from(leadsTable)
      .where((t) =>
        and(
          eq(t.teamId, options.teamId),
          options?.tags?.length
            ? arrayOverlaps(t.tags, options.tags)
            : undefined,
          typeof options.hasPhone === "boolean"
            ? options.hasPhone
              ? isNotNull(t.phone)
              : isNull(t.phone)
            : undefined,
          !options.searchQuery
            ? undefined
            : or(
                ilike(t.firstName, `%${options.searchQuery}%`),
                ilike(t.lastName, `%${options.searchQuery}%`),
                ilike(t.company, `%${options.searchQuery}%`),
                ilike(t.email, `%${options.searchQuery}%`),
                ilike(t.phone, `%${options.searchQuery}%`),
              ),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async count(options: LeadsCountArgs) {
    const { minScore, maxScore } = options;
    const [{ total }] = await this.db
      .select({ total: count(leadsTable.id) })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, options.teamId),
          isNumber(minScore) ? gte(leadsTable.score, minScore) : undefined,
          isNumber(maxScore) ? lte(leadsTable.score, maxScore) : undefined,
        ),
      );
    return total || 0;
  }

  async getStatuses(teamId: string) {
    const leads = await this.db
      .selectDistinct({ status: leadsTable.status })
      .from(leadsTable)
      .where(and(isNotNull(leadsTable.status), eq(leadsTable.teamId, teamId)));

    return leads.map((lead) => ({ id: lead.status || "NO_STATUS" }));
  }

  async getTags(teamId: string) {
    const leads = await this.db
      .selectDistinct({
        tag: sql<string>`unnest(${leadsTable.tags})`.as("tag"),
      })
      .from(leadsTable)
      .where(and(eq(leadsTable.teamId, teamId), isNotNull(leadsTable.tags)))
      .orderBy((t) => t.tag);

    return leads.map((lead) => lead.tag);
  }

  async findOneOrFail({ id, teamId }: FindOneLeadArgs) {
    const lead = await this.db.query.leads
      .findFirst({
        where: (t) => and(eq(t.id, id), eq(t.teamId, teamId)),
      })
      .then(orFail("lead"));
    return lead;
  }

  async create(options: CreateLeadArgs) {
    const [lead] = await this.db
      .insert(leadsTable)
      .values({
        teamId: options.teamId,
        ...options.input,
      })
      .returning();

    this.eventBus.publish(new LeadCreated(lead));

    return { lead };
  }

  async update(options: UpdateLeadArgs) {
    const [lead] = await this.db
      .update(leadsTable)
      .set(options.input)
      .where(
        and(
          eq(leadsTable.id, options.id),
          eq(leadsTable.teamId, options.teamId),
        ),
      )
      .returning();

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    this.eventBus.publish(new LeadUpdated(lead));

    return { lead };
  }

  async remove(options: DeleteLeadArgs) {
    const [lead] = await this.db
      .delete(leadsTable)
      .where(
        and(
          eq(leadsTable.id, options.id),
          eq(leadsTable.teamId, options.teamId),
        ),
      )
      .returning({ id: leadsTable.id });

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    return { deletedLeadId: lead.id };
  }

  async bulkRemove(options: BulkDeleteLeadArgs) {
    await this.db
      .delete(leadsTable)
      .where(
        and(
          inArray(leadsTable.id, options.leadIds),
          eq(leadsTable.teamId, options.teamId),
        ),
      );

    return { deletedLeadsCount: options.leadIds.length };
  }

  async createPhoneNumber(options: CreateLeadPhoneNumberArgs) {
    const total = await this.db.$count(
      leadPhoneNumbersTable,
      eq(leadPhoneNumbersTable.leadId, options.leadId),
    );

    if (total >= 3) {
      throw new BadRequestException(
        "lead can only have 3 additional phone numbers",
      );
    }

    const [leadPhoneNumber] = await this.db
      .insert(leadPhoneNumbersTable)
      .values({
        leadId: options.leadId,
        ...options.input,
      })
      .returning();

    return { leadPhoneNumber };
  }

  async updatePhoneNumber(options: UpdateLeadPhoneNumberArgs) {
    const [leadPhoneNumber] = await this.db
      .update(leadPhoneNumbersTable)
      .set({ label: options.label })
      .where(
        and(
          eq(leadPhoneNumbersTable.id, options.leadPhoneNumberId),
          eq(leadPhoneNumbersTable.leadId, options.leadId),
        ),
      )
      .returning();

    if (!leadPhoneNumber) {
      throw new ModelNotFoundError("lead phone number not found");
    }

    return { leadPhoneNumber };
  }

  async removePhoneNumber(options: DeleteLeadPhoneNumberArgs) {
    const [leadPhoneNumber] = await this.db
      .delete(leadPhoneNumbersTable)
      .where(
        and(
          eq(leadPhoneNumbersTable.id, options.leadPhoneNumberId),
          eq(leadPhoneNumbersTable.leadId, options.leadId),
        ),
      )
      .returning({ id: leadPhoneNumbersTable.id });

    if (!leadPhoneNumber) {
      throw new ModelNotFoundError("lead phone number not found");
    }

    return { deletedLeadPhoneNumberId: leadPhoneNumber.id };
  }
}
