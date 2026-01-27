import { apiAuth } from "@/lib/api-auth";

describe("apiAuth helper", () => {
  test("returns nulls when no token", async () => {
    // In test env cookies() will return empty - we expect nulls
    const ctx = await apiAuth();
    expect(ctx.userId).toBeNull();
    expect(ctx.teamId).toBeNull();
    expect(ctx.role).toBeNull();
    expect(ctx.isOwner).toBe(false);
    expect(typeof ctx.canBypass).toBe("boolean");
  });
});
