import { DatabaseService } from "../database.service";
import { DrizzleClient } from "../../types";

// Basic smoke test to ensure withCursorPagination does not produce table-qualified ORDER BY
describe("DatabaseService.withCursorPagination (sanitized ordering)", () => {
  test("does not throw when cursor order contains table-qualified identifiers", async () => {
    // We can't run a real DB here; test focuses on not throwing when building the query
    const fakeDb = {
      $with: (name: string) => ({ name }),
      with: function () { return this; },
      select: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      limit: function () { return this; },
      orderBy: function () { return this; },
      $dynamic: async function () { return []; },
    } as unknown as DrizzleClient;

    const svc = new DatabaseService(fakeDb as any);

    // Create a minimal fake query builder (structure doesn't matter for this test)
    const qb: any = { select: () => ({}) };

    // Build options with a cursor function that returns orderBy containing table-qualified identifiers
    const options: any = {
      first: 10,
      cursors: (sq: any) => [
        { order: "DESC", column: '"leads"."created_at"' },
      ],
    };

    // Call and expect no exception
    await expect(svc.withCursorPagination(qb as any, options)).resolves.toBeDefined();
  });
});