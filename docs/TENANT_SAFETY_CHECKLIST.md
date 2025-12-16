# Tenant Safety Checklist for Contributors

Use this checklist when developing new features or modifying existing code to ensure tenant isolation is maintained.

---

## Before Writing Code

### 1. Identify Data Ownership
- [ ] Does this feature access tenant-specific data?
- [ ] Which tables will be queried/modified?
- [ ] Are all relevant tables tenant-scoped (have `teamId`)?

### 2. Plan Access Pattern
- [ ] How will `teamId` be obtained? (from auth context, request params)
- [ ] Will the feature access data across multiple tenants? (should be NO unless admin feature)

---

## Database Schema Changes

### 3. New Tables
- [ ] Table includes `teamId: teamsRef({ onDelete: "cascade" }).notNull()`
- [ ] Index includes `teamId` for efficient filtering
- [ ] Foreign keys to tenant data use `CASCADE` delete
- [ ] Unique constraints include `teamId` where appropriate

```typescript
// TEMPLATE: New tenant-scoped table
export const myFeature = pgTable("my_feature", {
  id: primaryUlid("myfeat"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),  // REQUIRED
  // ... other fields
  createdAt,
  updatedAt,
}, (t) => [
  index().on(t.teamId),  // REQUIRED for performance
]);
```

### 4. Schema Modifications
- [ ] Adding column? Does it need tenant scoping?
- [ ] Adding foreign key? Is the referenced table tenant-scoped?
- [ ] Removing constraint? Could this break tenant isolation?

---

## Service Layer

### 5. All Queries Include teamId
- [ ] Every `SELECT` includes `where: eq(table.teamId, teamId)`
- [ ] Every `UPDATE` includes `where: and(eq(table.teamId, teamId), ...)`
- [ ] Every `DELETE` includes `where: and(eq(table.teamId, teamId), ...)`

```typescript
// CORRECT
async findByTeam(teamId: string, filters: Filters) {
  return this.db.query.myTable.findMany({
    where: and(
      eq(myTable.teamId, teamId),  // ALWAYS FIRST
      filters.status ? eq(myTable.status, filters.status) : undefined,
    ),
  });
}

// VIOLATION - Missing teamId
async findAll(filters: Filters) {
  return this.db.query.myTable.findMany({
    where: filters.status ? eq(myTable.status, filters.status) : undefined,
  });
}
```

### 6. teamId Source Validation
- [ ] `teamId` comes from authenticated user context, not request body
- [ ] Team membership is validated before data access
- [ ] Policy check (`teamPolicy.can().read/manage()`) is performed

```typescript
// CORRECT - Validated through policy
@Query(() => MyFeatureConnection)
async myFeatures(@Auth() user: User, @Args() args: MyFeatureArgs) {
  const team = await this.teamService.findById(args.teamId);
  await this.teamPolicy.can().read(user, team);  // VALIDATES MEMBERSHIP
  return this.service.findByTeam(team.id, args);
}

// VIOLATION - Trusting teamId from args without validation
@Query(() => MyFeatureConnection)
async myFeatures(@Args() args: MyFeatureArgs) {
  return this.service.findByTeam(args.teamId, args);  // NO VALIDATION
}
```

---

## Resolver/Controller Layer

### 7. Authorization Decorator
- [ ] `@UseAuthGuard()` or `@UseGuards(AuthGuard)` is applied
- [ ] Role-based restrictions use `@Roles()` decorator if needed

### 8. Team Context
- [ ] Resolver receives `teamId` as argument
- [ ] Team existence and membership is validated
- [ ] Only authorized team data is returned

---

## Queue Jobs

### 9. Job Data
- [ ] Job payload includes `teamId`
- [ ] Consumer validates `teamId` before processing
- [ ] Logs include `teamId` for debugging

```typescript
// CORRECT - Include teamId in job
await this.queue.add("PROCESS_LEAD", {
  teamId: lead.teamId,  // INCLUDE IN PAYLOAD
  leadId: lead.id,
});

// Consumer validates
async process(job: Job) {
  const { teamId, leadId } = job.data;
  const lead = await this.leadService.findOne(teamId, leadId);  // USES teamId
}
```

---

## API Endpoints

### 10. REST Controllers
- [ ] Endpoint extracts `teamId` from auth context or validated path param
- [ ] Response only includes data for the authenticated team

### 11. GraphQL Resolvers
- [ ] DataLoaders are tenant-aware (filter by teamId)
- [ ] Related entities load only within same tenant

---

## Testing

### 12. Unit Tests
- [ ] Test with multiple tenant IDs
- [ ] Verify queries include teamId filter
- [ ] Verify unauthorized access returns error

### 13. Integration Tests
- [ ] Create data for Team A
- [ ] Attempt access from Team B - should fail or return empty
- [ ] Verify no cross-tenant data leakage

```typescript
describe("Tenant Isolation", () => {
  it("should not return Team A data when queried by Team B", async () => {
    // Create lead for Team A
    const leadA = await createLead({ teamId: teamA.id });

    // Query as Team B
    const result = await service.findByTeam(teamB.id, {});

    // Should not find Team A's lead
    expect(result).not.toContainEqual(expect.objectContaining({ id: leadA.id }));
  });
});
```

---

## Code Review Checklist

### For Reviewers

**Schema Changes:**
- [ ] New tables have `teamId` with NOT NULL constraint
- [ ] Indexes include `teamId` for efficient filtering
- [ ] No shared/global tables unless explicitly justified

**Queries:**
- [ ] All queries filter by `teamId`
- [ ] No queries that could return cross-tenant data
- [ ] Complex queries (joins, subqueries) maintain tenant boundary

**Authorization:**
- [ ] Auth guards are applied
- [ ] Team membership is validated
- [ ] Policy checks are performed before data access

**Jobs:**
- [ ] Job payloads include `teamId`
- [ ] Consumer validates tenant context
- [ ] Logs include tenant identifier

---

## Common Anti-Patterns to Avoid

### 1. Implicit Team Context
```typescript
// BAD - Assumes teamId is set somewhere
async findAll() {
  return this.db.query.leads.findMany();  // ✗ No teamId filter
}
```

### 2. Trusting Client-Provided teamId
```typescript
// BAD - No validation that user belongs to this team
async getData(@Body() { teamId }) {
  return this.service.findByTeam(teamId);  // ✗ Unvalidated
}
```

### 3. Shared Caches Without Tenant Key
```typescript
// BAD - Cache key doesn't include teamId
const cacheKey = `leads:${status}`;  // ✗ Shared across tenants

// GOOD
const cacheKey = `team:${teamId}:leads:${status}`;  // ✓ Tenant-scoped
```

### 4. Bulk Operations Without Tenant Filter
```typescript
// BAD - Updates all leads, not just for one tenant
await db.update(leads).set({ status: "ARCHIVED" }).where(gt(leads.createdAt, cutoff));

// GOOD
await db.update(leads).set({ status: "ARCHIVED" }).where(
  and(eq(leads.teamId, teamId), gt(leads.createdAt, cutoff))
);
```

---

## Quick Reference

| Operation | Required Pattern |
|-----------|------------------|
| SELECT | `where: eq(table.teamId, teamId)` |
| INSERT | Include `teamId` in values |
| UPDATE | `where: and(eq(table.teamId, teamId), ...)` |
| DELETE | `where: and(eq(table.teamId, teamId), ...)` |
| Job Queue | Include `teamId` in job payload |
| Cache Key | Include `teamId` in cache key |
| Log Entry | Include `teamId` in log context |
