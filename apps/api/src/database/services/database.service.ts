import { Injectable } from "@nestjs/common";
import { type PgSelect } from "drizzle-orm/pg-core";
import { count } from "drizzle-orm";
import { ObjectConnection, ObjectEdge } from "@/app/apollo/graphql-relay";
import { InjectDB } from "../decorators";
import { DrizzleClient } from "../types";
import {
  CursorConfig,
  CursorPaginationOptions,
  generateCursor,
} from "@haorama/drizzle-postgres-extra";

type InferRow<T extends PgSelect> = T extends Array<infer U> ? U : never;

@Injectable()
export class DatabaseService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  private getPaginationLimit(limit: number) {
    return limit > 100 ? 100 : limit;
  }

  private async getCount<T extends PgSelect>(qb: T) {
    const sq = this.db.$with("pagination_sq").as(qb);

    const query = this.db
      .with(sq)
      .select({ total: count().as("total") })
      .from(sq);

    const [{ total }] = await query;

    return { total: Number(total) };
  }

  async withCursorPagination<T extends PgSelect>(
    qb: T,
    options: CursorPaginationOptions<T>,
  ) {
    const { first, after, last, before } = options;
    const actualLimit = first ?? last ?? 20;
    const limit = this.getPaginationLimit(actualLimit) + 1;
    const cursorToken = after ?? before;
    const isForward = !last;

    const { total } = await this.getCount(qb);
    const sq = this.db.$with("cursor_query").as(qb);
    const cursors = options.cursors(sq);
    if (before) {
      // reverse the given order
      cursors.forEach((cursor) => {
        if (cursor) {
          cursor.order = cursor.order === "ASC" ? "DESC" : "ASC";
        }
      });
    }
    const cursorConfig: CursorConfig = { cursors };

    const cursor = generateCursor(cursorConfig);

    const query = this.db
      .with(sq)
      .select()
      .from(sq)
      .where(cursor.where(cursorToken))
      .limit(limit)
      .orderBy(...cursor.orderBy)
      .$dynamic();

    const results = await query;
    const hasMore = results.length > actualLimit;

    // if results is greater than actualLimit, remove the last element, order matters, make sure pop is called before reverse
    if (hasMore) {
      results.pop();
    }

    if (!isForward) {
      results.reverse();
    }

    const startCursor = cursor.serialize(results[0]);
    const endCursor = cursor.serialize(results.at(-1));

    const edges: ObjectEdge<InferRow<Awaited<T>>>[] = results.map((item) => ({
      cursor: cursor.serialize(item) as string,
      node: item as any,
    }));

    const connection: ObjectConnection<ObjectEdge<InferRow<Awaited<T>>>> & { totalCount: number } = {
      edges,
      pageInfo: {
        startCursor,
        endCursor,
        hasNextPage: isForward ? hasMore : !!before,
        hasPrevPage: !results.length ? false : isForward ? !!after : hasMore,
        total,
        totalPerPage: results.length,
      },
      totalCount: total,
    };

    return connection;
  }
}
